import os
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Query, Response, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.inspection import (
    InspectionCreateRequest,
    InspectionCreateResponse,
    InspectionDetailResponse,
)
from app.services.inspection_service import InspectionService
from app.core.config import settings

router = APIRouter(tags=["Inspections"])


@router.post(
    "/inspections",
    response_model=InspectionCreateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload package image(s) and initiate multi-panel compliance inspection",
)
async def create_inspection(
    request: InspectionCreateRequest,
    db: Session = Depends(get_db),
):
    """
    Initiates multi-angle OCR extraction, fusion, and Legal Metrology compliance evaluation
    using images hosted on Cloudinary.
    """
    urls_to_process = []
    if request.image_urls:
        urls_to_process.extend(request.image_urls)
    if request.image_url:
        if request.image_url not in urls_to_process:
            urls_to_process.append(request.image_url)

    if not urls_to_process:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one image URL ('image_url' or 'image_urls') must be provided.",
        )

    return InspectionService.create_inspection(db=db, image_urls=urls_to_process)


@router.get(
    "/inspections",
    response_model=list[InspectionDetailResponse],
    summary="List recent compliance inspections",
)
def list_inspections(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(None, description="Filter by inspection status"),
    search: Optional[str] = Query(None, description="Search by product name or brand (case-insensitive)"),
    db: Session = Depends(get_db),
):
    """
    List historical inspection audits with pagination, status filters, and product/brand search.
    """
    return InspectionService.list_inspections(db=db, limit=limit, offset=offset, status_filter=status, search=search)


@router.get(
    "/inspections/stats",
    summary="Get aggregated compliance audit statistics",
)
def get_inspection_stats(
    db: Session = Depends(get_db),
):
    """
    Retrieve total audits, compliant, non-compliant, needs-review, and in-progress inspection counts.
    """
    return InspectionService.get_inspection_stats(db=db)


@router.get(
    "/inspections/{inspection_id}",
    response_model=InspectionDetailResponse,
    summary="Get inspection status and compliance findings",
)
def get_inspection(
    inspection_id: str,
    db: Session = Depends(get_db),
):
    """
    Retrieve inspection progress, extracted product data, and Legal Metrology compliance rule findings.
    """
    return InspectionService.get_inspection(db=db, inspection_id=inspection_id)



from app.core.rbac import get_current_user, AuthUser, UserRole

@router.get(
    "/auth/me",
    summary="Get current user authentication profile and RBAC role",
)
def get_current_user_profile(
    current_user: AuthUser = Depends(get_current_user),
):
    """
    Returns the current session role (Admin, Inspector, Public Viewer) and authorized capabilities.
    """
    capabilities = {
        UserRole.ADMIN: ["upload", "inspect", "override_rules", "view_audit_logs", "export_reports", "manage_rules"],
        UserRole.INSPECTOR: ["upload", "inspect", "view_history", "export_reports", "issue_notices"],
        UserRole.PUBLIC_VIEWER: ["upload", "inspect", "view_report_summary"],
    }
    return {
        "user_id": current_user.user_id,
        "name": current_user.name,
        "role": current_user.role.value,
        "department": current_user.department,
        "capabilities": capabilities.get(current_user.role, []),
    }
