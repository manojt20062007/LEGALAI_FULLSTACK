import os
import logging
from typing import Union, List, Dict, Any
from pathlib import Path
import io

from app.services.ocr.base import OCRService, OCRResult
from google.cloud import vision

logger = logging.getLogger(__name__)

class GoogleCloudOCRAdapter(OCRService):
    """
    Adapter for Google Cloud Vision API.
    Provides exceptionally high accuracy for curved, reflective, and messy labels.
    Requires GOOGLE_APPLICATION_CREDENTIALS environment variable.
    """

    def __init__(self):
        logger.info("Initializing Google Cloud Vision API Client...")
        try:
            self.client = vision.ImageAnnotatorClient()
            logger.info("Google Cloud Vision API Client initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Google Cloud Vision: {e}")
            raise e

    def extract_text(self, image_data: Union[bytes, str, Path]) -> OCRResult:
        if not self.client:
            logger.error("Google Cloud Vision client is not initialized.")
            return OCRResult(text="", confidence=0.0, raw_detections=[])

        try:
            # Prepare image data
            if isinstance(image_data, (str, Path)):
                with open(image_data, 'rb') as f:
                    content = f.read()
            elif isinstance(image_data, bytes):
                content = image_data
            else:
                # If it's a PIL Image
                buf = io.BytesIO()
                image_data.save(buf, format='PNG')
                content = buf.getvalue()

            image = vision.Image(content=content)

            # Document Text Detection is better for dense packaging text than standard text detection
            response = self.client.document_text_detection(image=image)
            
            if response.error.message:
                raise Exception(f"Google Vision API Error: {response.error.message}")

            annotations = response.text_annotations
            if not annotations:
                return OCRResult(text="", confidence=1.0, raw_detections=[])

            # The first annotation contains the full block of text
            full_text = annotations[0].description

            all_detections: List[Dict[str, Any]] = []
            
            # The remaining annotations are individual words
            for word_annotation in annotations[1:]:
                text = word_annotation.description
                # Google Vision vertices might omit x or y if they are exactly 0
                vertices = word_annotation.bounding_poly.vertices
                box = [[getattr(v, 'x', 0.0), getattr(v, 'y', 0.0)] for v in vertices]
                
                all_detections.append({
                    "text": text,
                    "box": box,
                    "confidence": 0.95  # Cloud API doesn't easily expose word-level conf in text_annotations, assume high
                })

            logger.info(f"Google Cloud Vision Extracted {len(all_detections)} words.")

            return OCRResult(
                text=full_text,
                confidence=0.95,
                raw_detections=all_detections,
            )

        except Exception as e:
            logger.error(f"GoogleCloudOCRAdapter failed: {e}", exc_info=True)
            return OCRResult(text="", confidence=0.0, raw_detections=[])
