import io
import logging
import numpy as np
from typing import Union, List, Dict, Any
from pathlib import Path
from PIL import Image

import easyocr
from app.services.ocr.base import OCRService, OCRResult

logger = logging.getLogger(__name__)

class PaddleOCRAdapter(OCRService):
    """
    Adapter for deep-learning based OCR using EasyOCR (PaddleOCR alternative).
    EasyOCR is used because PaddlePaddle does not support Python 3.14.
    It uses DBNet for text detection (which traces curved text) and CRNN for recognition.
    """

    def __init__(self, lang: str = "en"):
        self.lang = lang
        # Initialize EasyOCR reader. Download models on first run.
        # Set gpu=False by default to ensure compatibility on all machines.
        logger.info("Initializing EasyOCR Engine (Deep Learning OCR)...")
        try:
            self.reader = easyocr.Reader([lang], gpu=False)
            logger.info("EasyOCR Engine initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize EasyOCR: {e}")
            self.reader = None

    def extract_text(self, image_data: Union[bytes, str, Path]) -> OCRResult:
        if not self.reader:
            return OCRResult(text="", confidence=0.0, raw_detections=[])

        try:
            # Load image into numpy array format expected by EasyOCR
            if isinstance(image_data, (str, Path)):
                img = Image.open(str(image_data))
            elif isinstance(image_data, bytes):
                img = Image.open(io.BytesIO(image_data))
            elif isinstance(image_data, Image.Image):
                img = image_data
            else:
                raise ValueError("Unsupported image input type")

            if img.mode != "RGB":
                img = img.convert("RGB")

            # Scale down image if it's massive to prevent memory spikes
            w, h = img.size
            if max(w, h) > 2000:
                scale = 2000 / max(w, h)
                img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

            img_np = np.array(img)

            # Run EasyOCR
            # Returns list of tuples: (bounding_box, text, confidence)
            # bounding_box is [top_left, top_right, bottom_right, bottom_left]
            results = self.reader.readtext(img_np)

            all_lines: List[str] = []
            all_detections: List[Dict[str, Any]] = []
            total_conf = 0.0

            for bbox, text, conf in results:
                if text.strip():
                    all_lines.append(text.strip())
                    # Format bbox for our system
                    all_detections.append({
                        "text": text.strip(),
                        "box": [[float(p[0]), float(p[1])] for p in bbox],
                        "confidence": float(conf)
                    })
                    total_conf += conf

            full_text = "\n".join(all_lines)
            avg_conf = (total_conf / len(results)) if results else 0.80

            logger.info(
                f"EasyOCR Extraction: {len(all_lines)} lines, "
                f"confidence={avg_conf:.2f}"
            )

            return OCRResult(
                text=full_text,
                confidence=avg_conf,
                raw_detections=all_detections,
            )

        except Exception as e:
            logger.error(f"PaddleOCRAdapter (EasyOCR fallback) failed: {e}", exc_info=True)
            return OCRResult(text="", confidence=0.30, raw_detections=[])
