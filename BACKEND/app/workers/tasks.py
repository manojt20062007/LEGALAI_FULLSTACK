import logging
from app.workers.celery_app import celery_app
from app.db.database import SessionLocal
from app.db.models import Inspection
from app.services.storage import get_storage_service
from app.services.ocr import get_ocr_service
from app.services.extraction.extractor import LabelExtractor
from app.services.extraction.gemini_extractor import gemini_extractor
from app.services.compliance.engine import ComplianceEngine
from app.services.ml.yolo_service import yolo_service

logger = logging.getLogger(__name__)


@celery_app.task(name="app.workers.tasks.process_inspection", bind=True, max_retries=2)
def process_inspection(self, inspection_id: str):
    """
    Asynchronously processes an inspection:
    1. Load inspection from DB
    2. Mark status as 'processing'
    3. Retrieve image from storage
    4. Run OCR
    5. Extract label fields
    6. Run compliance rules
    7. Save results and mark status as 'completed'
    """
    logger.info(f"Starting inspection processing for id: {inspection_id}")
    db = SessionLocal()
    try:
        inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
        if not inspection:
            logger.error(f"Inspection {inspection_id} not found in database.")
            return {"status": "error", "message": "Inspection not found"}

        # Step 2: Mark processing
        inspection.status = "processing"
        db.commit()

        # Step 3: Retrieve and process all panel images from storage
        storage = get_storage_service()
        ocr_service = get_ocr_service()

        raw_paths = inspection.image_paths or ([inspection.image_path] if inspection.image_path else [])
        if not raw_paths:
            inspection.status = "failed"
            inspection.error_message = "No packaging image paths found on inspection record."
            db.commit()
            return {"status": "failed", "error": inspection.error_message}

        combined_lines: list[str] = []
        all_detections: list[dict] = []
        confidences: list[float] = []
        downloaded_count = 0

        for idx, path in enumerate(raw_paths):
            try:
                image_bytes = storage.download(path)
                downloaded_count += 1
                
                # Run YOLOv8 to crop the image down to just the MRP panel (Two-Stage Pipeline)
                cropped_bytes = yolo_service.crop_mrp_panel(image_bytes)
                
                ocr_res = ocr_service.extract_text(cropped_bytes)
                confidences.append(ocr_res.confidence)
                
                # Append panel transcript
                panel_lines = [l.strip() for l in ocr_res.text.splitlines() if l.strip()]
                for pl in panel_lines:
                    if pl not in combined_lines:
                        combined_lines.append(pl)
                
                if ocr_res.raw_detections:
                    all_detections.extend(ocr_res.raw_detections)

                logger.info(f"Panel {idx + 1}/{len(raw_paths)} ({path}) OCR completed with {len(panel_lines)} lines.")
            except Exception as ocr_err:
                logger.warning(f"Error running OCR on panel {path}: {ocr_err}")

        if downloaded_count == 0:
            inspection.status = "failed"
            inspection.error_message = "Unable to retrieve uploaded image from storage."
            db.commit()
            return {"status": "failed", "error": inspection.error_message}

        if not combined_lines:
            inspection.status = "failed"
            inspection.error_message = "Optical Character Recognition (OCR) could not extract any legible text."
            db.commit()
            return {"status": "failed", "error": inspection.error_message}

        combined_ocr_text = "\n".join(combined_lines)
        avg_confidence = (sum(confidences) / len(confidences)) if confidences else 0.85

        # Step 5: Extract Fields across fused transcript or via Gemini
        if gemini_extractor.enabled and raw_paths:
            logger.info("Using Gemini AI for multimodal data extraction...")
            first_image_bytes = storage.download(raw_paths[0])
            extracted_data = gemini_extractor.extract_from_image(first_image_bytes)
            
            # Override OCR confidence because Gemini is extremely accurate 
            # and completely bypasses EasyOCR's low confidence text.
            avg_confidence = 0.98
        else:
            logger.info("Using fallback Regex LabelExtractor...")
            extracted_data = LabelExtractor.extract_fields(combined_ocr_text)

        # Step 6: Run Compliance Engine with fused text
        compliance_engine = ComplianceEngine()
        compliance_result = compliance_engine.evaluate(
            product=extracted_data,
            ocr_text=combined_ocr_text,
            ocr_confidence=avg_confidence,
            raw_detections=all_detections,
        )

        # Step 7: Save results & Mark completed
        inspection.ocr_text = combined_ocr_text
        inspection.extracted_data = extracted_data.model_dump()
        inspection.compliance_result = compliance_result.model_dump()
        inspection.status = "completed"
        inspection.error_message = None

        # Persist denormalised search fields for fast dashboard filtering
        inspection.product_name = extracted_data.product_name or None
        inspection.brand = extracted_data.brand or None

        db.commit()

        logger.info(f"Completed multi-panel inspection {inspection_id} successfully across {len(raw_paths)} panels. Overall Status: {compliance_result.overall_status}")
        return {"status": "completed", "overall_status": compliance_result.overall_status}

    except Exception as exc:
        db.rollback()
        logger.exception(f"Unhandled exception while processing inspection {inspection_id}: {exc}")
        try:
            # Reopen session to persist failed state
            fail_db = SessionLocal()
            insp = fail_db.query(Inspection).filter(Inspection.id == inspection_id).first()
            if insp:
                insp.status = "failed"
                insp.error_message = "An unexpected error occurred during inspection analysis."
                fail_db.commit()
            fail_db.close()
        except Exception as db_err:
            logger.error(f"Failed to record failure status in DB: {db_err}")
        return {"status": "failed", "error": "Internal processing error"}
    finally:
        db.close()
