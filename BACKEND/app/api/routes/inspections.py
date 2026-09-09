import os
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Query, Response, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.inspection import (
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
    images: list[UploadFile] = File(default=[], description="Multiple packaging panel photos (e.g., Front, Back, MRP)"),
    image: Optional[UploadFile] = File(default=None, description="Primary packaging photo"),
    db: Session = Depends(get_db),
):
    """
    Upload one or more images of a packaged commodity (e.g. Front display panel, MRP label, Manufacturer panel).
    Initiates multi-angle OCR extraction, fusion, and Legal Metrology compliance evaluation.
    """
    files_to_process: list[UploadFile] = []
    if images:
        files_to_process.extend([f for f in images if f.filename])
    if image and image.filename:
        if not any(f.filename == image.filename for f in files_to_process):
            files_to_process.append(image)

    if not files_to_process:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one packaging image ('image' or 'images') must be uploaded.",
        )

    contents_list: list[bytes] = []
    for f in files_to_process:
        c = await f.read()
        contents_list.append(c)

    return InspectionService.create_inspection(db=db, files=files_to_process, contents_list=contents_list)


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


@router.get(
    "/inspections/{inspection_id}/report",
    summary="Download or view inspection report",
)
def get_inspection_report(
    inspection_id: str,
    format: Optional[str] = Query("pdf", pattern="^(pdf|html|csv|json|xlsx)$", description="Report format: 'pdf', 'html', 'csv', 'json', or 'xlsx'"),
    db: Session = Depends(get_db),
):
    """
    Generate and retrieve the compliance inspection report in PDF, HTML, CSV, or JSON format.
    """
    content_bytes, media_type, filename = InspectionService.get_inspection_report(
        db=db,
        inspection_id=inspection_id,
        format_type=format,
    )

    disposition = "inline" if format == "html" else f'attachment; filename="{filename}"'
    return Response(
        content=content_bytes,
        media_type=media_type,
        headers={"Content-Disposition": disposition},
    )


@router.get(
    "/storage/files/{filename}",
    include_in_schema=False,
)
def get_local_storage_file(filename: str):
    """Serve uploaded images stored in local storage."""
    safe_filename = os.path.basename(filename)
    file_path = os.path.join(settings.LOCAL_STORAGE_DIR, safe_filename)
    if not os.path.exists(file_path):
        return Response(status_code=404, content="File not found")
    return FileResponse(file_path)

