from datetime import datetime, timezone
from fastapi import APIRouter
from app.core.config import settings
from app.schemas.inspection import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def health_check():
    """Service health check endpoint."""
    return HealthResponse(
        status="ok",
        version=settings.VERSION,
        timestamp=datetime.now(timezone.utc),
    )
