import io
import os
import tempfile
import logging
from typing import Union, List, Dict, Any
from pathlib import Path
from PIL import Image
import numpy as np
from app.services.ocr.base import OCRService, OCRResult

logger = logging.getLogger(__name__)

try:
    from paddleocr import PaddleOCR
    HAS_PADDLEOCR = True
except ImportError:
    HAS_PADDLEOCR = False


class PaddleOCRAdapter(OCRService):
    def __init__(self, lang: str = "en", use_angle_cls: bool = True):
        if not HAS_PADDLEOCR:
            raise RuntimeError(
                "PaddleOCR is not installed. Please install 'paddlepaddle' and 'paddleocr' "
                "or set OCR_PROVIDER=mock in your .env configuration."
            )
        self.ocr = PaddleOCR(use_angle_cls=use_angle_cls, lang=lang, show_log=False)

    def extract_text(self, image_data: Union[bytes, str, Path]) -> OCRResult:
        # Prepare image for PaddleOCR (accepts file path or numpy array)
        if isinstance(image_data, (str, Path)):
            img_path = str(image_data)
            result = self.ocr.ocr(img_path, cls=True)
        elif isinstance(image_data, bytes):
            image = Image.open(io.BytesIO(image_data)).convert("RGB")
            img_np = np.array(image)
            result = self.ocr.ocr(img_np, cls=True)
        else:
            raise ValueError(f"Unsupported image data type: {type(image_data)}")

        extracted_lines: List[str] = []
        confidences: List[float] = []
        raw_detections: List[Dict[str, Any]] = []

        if result and len(result) > 0 and result[0] is not None:
            for line in result[0]:
                box = line[0]
                text, conf = line[1]
                extracted_lines.append(text)
                confidences.append(float(conf))
                raw_detections.append({
                    "box": box,
                    "text": text,
                    "confidence": float(conf),
                })

        full_text = "\n".join(extracted_lines)
        avg_confidence = float(np.mean(confidences)) if confidences else 0.0

        return OCRResult(
            text=full_text,
            confidence=round(avg_confidence, 4),
            raw_detections=raw_detections,
        )
