import logging
import requests
from app.workers.celery_app import celery_app
from app.db.database import SessionLocal
from app.db.models import Inspection
from app.services.ocr import get_ocr_service
from app.services.extraction.extractor import LabelExtractor
from app.services.extraction.gemini_extractor import gemini_extractor
from app.services.compliance.engine import ComplianceEngine

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

        # Step 3: Retrieve and process all panel images from Cloudinary
        ocr_service = get_ocr_service()

        raw_urls = inspection.image_urls or ([inspection.image_url] if inspection.image_url else [])
        if not raw_urls:
            inspection.status = "failed"
            inspection.error_message = "No packaging image URLs found on inspection record."
            db.commit()
            return {"status": "failed", "error": inspection.error_message}

        combined_lines: list[str] = []
        all_detections: list[dict] = []
        confidences: list[float] = []
        downloaded_count = 0
        first_image_bytes = None

        for idx, url in enumerate(raw_urls):
            try:
                resp = requests.get(url, timeout=10.0)
                if resp.status_code != 200:
                    logger.warning(f"Failed to download image from {url}")
                    continue
                image_bytes = resp.content
                if idx == 0:
                    first_image_bytes = image_bytes
                downloaded_count += 1
                
                # Directly process the raw image with OCR (No YOLO)
                ocr_res = ocr_service.extract_text(image_bytes)
                confidences.append(ocr_res.confidence)
                
                # Append panel transcript
                panel_lines = [l.strip() for l in ocr_res.text.splitlines() if l.strip()]
                for pl in panel_lines:
                    if pl not in combined_lines:
                        combined_lines.append(pl)
                
                if ocr_res.raw_detections:
                    all_detections.extend(ocr_res.raw_detections)

                logger.info(f"Panel {idx + 1}/{len(raw_urls)} OCR completed with {len(panel_lines)} lines.")
            except Exception as ocr_err:
                logger.warning(f"Error running OCR on panel {url}: {ocr_err}")

        if downloaded_count == 0:
            inspection.status = "failed"
            inspection.error_message = "Unable to retrieve uploaded image from Cloudinary."
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
        if gemini_extractor.enabled and first_image_bytes:
            logger.info("Using Gemini AI for multimodal data extraction...")
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

        logger.info(f"Completed multi-panel inspection {inspection_id} successfully across {len(raw_urls)} panels. Overall Status: {compliance_result.overall_status}")
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
