import logging
from app.core.config import settings
from app.services.storage.base import StorageService
from app.services.storage.local import LocalStorageService

logger = logging.getLogger(__name__)


def get_storage_service() -> StorageService:
    """Factory to get configured storage provider."""
    provider = settings.STORAGE_PROVIDER.lower()
    
    if provider == "minio" or provider == "s3":
        try:
            from app.services.storage.minio import MinIOStorageService
            return MinIOStorageService()
        except Exception as e:
            logger.warning(f"MinIO initialization failed ({e}). Falling back to LocalStorageService.")
            return LocalStorageService()
            
    return LocalStorageService()
