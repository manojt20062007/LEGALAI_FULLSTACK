import os
import uuid
import logging
from typing import Optional, Tuple, List
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from PIL import Image
import io

from app.core.config import settings
from app.db.models import Inspection
from app.schemas.inspection import (
    InspectionCreateResponse,
    InspectionDetailResponse,
    InspectionStatus,
    ComplianceResult,
)
from app.services.storage import get_storage_service

logger = logging.getLogger(__name__)


class InspectionService:
    @staticmethod
    def validate_image_file(file: UploadFile, contents: bytes) -> None:
        """Validate image size, extension, and integrity."""
        # 1. Check size limit
        max_size_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
        if len(contents) > max_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size exceeds maximum allowed limit of {settings.MAX_FILE_SIZE_MB}MB.",
            )

        if len(contents) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )

        # 2. Check extension
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file extension '{ext}'. Allowed extensions: {', '.join(settings.ALLOWED_EXTENSIONS)}",
            )

        # 3. Check MIME type
        if file.content_type and file.content_type not in settings.ALLOWED_MIME_TYPES:
            # If standard image mime types match, allow
            if not file.content_type.startswith("image/"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid MIME type '{file.content_type}'. Please upload a valid image file.",
                )

        # 4. Verify image content with PIL
        try:
            image = Image.open(io.BytesIO(contents))
            image.verify()
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is corrupted or not a valid image.",
            )

    @classmethod
    def create_inspection(
        cls, db: Session, image_urls: List[str], user_id: Optional[str] = None
    ) -> InspectionCreateResponse:
        """Create inspection supporting 1 to N Cloudinary URLs and dispatch processing."""
        if not image_urls:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one image URL must be provided.",
            )

        # Generate unique inspection ID
        inspection_id = str(uuid.uuid4())

        primary_url = image_urls[0]

        # Create database record
        inspection = Inspection(
            id=inspection_id,
            user_id=user_id,
            status=InspectionStatus.QUEUED.value,
            image_path=primary_url, # Fallback compat
            image_url=primary_url,
            image_paths=image_urls, # Fallback compat
            image_urls=image_urls,
        )
        db.add(inspection)
        db.commit()
        db.refresh(inspection)

        # Trigger Celery asynchronous task or fallback to eager execution
        dispatched = False
        if not settings.CELERY_ALWAYS_EAGER:
            try:
                import redis
                # Quick non-blocking ping check with 0.2s timeout
                r = redis.Redis.from_url(settings.REDIS_URL, socket_connect_timeout=0.2, socket_timeout=0.2)
                r.ping()
                from app.workers.tasks import process_inspection
                process_inspection.apply_async(args=[inspection_id])
                dispatched = True
            except Exception:
                logger.info("Redis queue unavailable. Executing inspection processing synchronously.")

        if not dispatched:
            try:
                from app.workers.tasks import process_inspection
                process_inspection(inspection_id)
                db.refresh(inspection)
            except Exception as sync_err:
                logger.error(f"Sync processing failed: {sync_err}")

        return InspectionCreateResponse(
            id=inspection.id,
            status=InspectionStatus(inspection.status),
            created_at=inspection.created_at,
        )

    @staticmethod
    def get_inspection(db: Session, inspection_id: str) -> InspectionDetailResponse:
        """Retrieve inspection details and parse compliance results."""
        inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
        if not inspection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inspection with ID '{inspection_id}' was not found.",
            )

        storage = get_storage_service()
        image_url = storage.get_url(inspection.image_path) if inspection.image_path else inspection.image_url
        
        # Build image URLs list
        raw_paths = inspection.image_paths or ([inspection.image_path] if inspection.image_path else [])
        image_urls = [storage.get_url(p) for p in raw_paths] if raw_paths else ([image_url] if image_url else [])

        result_obj = None
        if inspection.compliance_result:
            try:
                result_obj = ComplianceResult.model_validate(inspection.compliance_result)
            except Exception as e:
                logger.error(f"Failed to validate compliance result schema for inspection {inspection_id}: {e}")

        return InspectionDetailResponse(
            id=inspection.id,
            status=InspectionStatus(inspection.status),
            created_at=inspection.created_at,
            updated_at=inspection.updated_at,
            image_url=image_url,
            image_urls=image_urls,
            result=result_obj,
            error_message=inspection.error_message,
        )

    @classmethod
    def list_inspections(
        cls,
        db: Session,
        limit: int = 50,
        offset: int = 0,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
        user_id: Optional[str] = None,
    ):
        """Retrieve recent inspections with optional status, search filtering, and user isolation."""
        query = db.query(Inspection).order_by(Inspection.created_at.desc())
        if user_id:
            query = query.filter(Inspection.user_id == user_id)
        if status_filter:
            query = query.filter(Inspection.status == status_filter)
        if search:
            term = f"%{search.strip()}%"
            from sqlalchemy import or_
            query = query.filter(
                or_(
                    Inspection.product_name.ilike(term),
                    Inspection.brand.ilike(term),
                )
            )
        
        inspections = query.offset(offset).limit(limit).all()
        results = []
        storage = get_storage_service()
        
        for insp in inspections:
            comp_res = None
            if insp.compliance_result:
                try:
                    comp_res = ComplianceResult.model_validate(insp.compliance_result)
                except Exception:
                    pass
            
            img_url = storage.get_url(insp.image_path) if insp.image_path else insp.image_url
            results.append(
                InspectionDetailResponse(
                    id=insp.id,
                    status=InspectionStatus(insp.status),
                    created_at=insp.created_at,
                    updated_at=insp.updated_at,
                    image_url=img_url,
                    result=comp_res,
                    error_message=insp.error_message,
                )
            )
        return results

    @classmethod
    def get_inspection_stats(cls, db: Session):
        """Calculate aggregate inspection and compliance statistics."""
        all_inspections = db.query(Inspection).all()
        total = len(all_inspections)
        compliant = 0
        non_compliant = 0
        needs_review = 0
        processing = 0

        for insp in all_inspections:
            if insp.status in (InspectionStatus.QUEUED.value, InspectionStatus.PROCESSING.value):
                processing += 1
            elif insp.compliance_result:
                overall = insp.compliance_result.get("overall_status")
                if overall == "COMPLIANT":
                    compliant += 1
                elif overall == "NON_COMPLIANT":
                    non_compliant += 1
                else:
                    needs_review += 1

        return {
            "total": total,
            "compliant": compliant,
            "non_compliant": non_compliant,
            "needs_review": needs_review,
            "processing": processing,
        }



