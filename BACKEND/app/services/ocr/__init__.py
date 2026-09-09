import logging
from app.core.config import settings
from app.services.ocr.base import OCRService
from app.services.ocr.mock_adapter import MockOCRAdapter

logger = logging.getLogger(__name__)


def get_ocr_service() -> OCRService:
    """Factory to get configured OCR service."""
    provider = settings.OCR_PROVIDER.lower()
    
    import os
    import dotenv
    dotenv.load_dotenv()
    
    if "GOOGLE_APPLICATION_CREDENTIALS" in os.environ or provider == "googlecloud":
        try:
            from app.services.ocr.google_cloud_adapter import GoogleCloudOCRAdapter
            return GoogleCloudOCRAdapter()
        except Exception as e:
            logger.warning(f"Google Cloud OCR failed to load ({e}). Trying fallback OCR.")

    if provider == "mock":
        return MockOCRAdapter()

    if provider == "paddleocr":
        try:
            from app.services.ocr.paddle_ocr_adapter import PaddleOCRAdapter
            return PaddleOCRAdapter()
        except Exception as e:
            logger.warning(f"PaddleOCR failed to load ({e}). Trying Windows native OCR.")

    # Default to PaddleOCRAdapter (EasyOCR backend) for robust curved label handling
    try:
        from app.services.ocr.paddle_ocr_adapter import PaddleOCRAdapter
        return PaddleOCRAdapter()
    except Exception as e:
        logger.warning(f"PaddleOCRAdapter failed to load ({e}). Falling back to WindowsNativeOCRAdapter.")

    # Fallback to Windows Native hardware-accelerated OCR
    try:
        from app.services.ocr.windows_ocr_adapter import WindowsNativeOCRAdapter
        return WindowsNativeOCRAdapter()
    except Exception as e:
        logger.warning(f"WindowsNativeOCRAdapter failed to load ({e}). Falling back to MockOCRAdapter.")
        return MockOCRAdapter()

