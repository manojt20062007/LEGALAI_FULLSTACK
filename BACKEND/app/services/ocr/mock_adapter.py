import re
from typing import Union, Dict, Any, List
from pathlib import Path
from app.services.ocr.base import OCRService, OCRResult


class MockOCRAdapter(OCRService):
    """
    Mock OCR adapter for development and testing when PaddleOCR is not available.
    Supports preset label templates and custom test scenarios based on filename/hints.
    """

    DEFAULT_COMPLIANT_LABEL = """
PRODUCT: Himalayan Natural Spring Water
BRAND: AquaPure
MANUFACTURED BY: AquaPure Beverages India Pvt. Ltd., Plot No. 42, Sector 5, Haridwar, Uttarakhand - 249403
NET QUANTITY: 1000 ml (1 L)
MRP: Rs. 45.00 (INCL. OF ALL TAXES)
MONTH & YEAR OF MFG: 01/2026
COUNTRY OF ORIGIN: India
CONSUMER CARE: Toll Free: 1800-200-9999 | Email: customercare@aquapure.in
    """.strip()

    NON_COMPLIANT_MISSING_MRP = """
PRODUCT: Roasted Almond Crunch
BRAND: NutriSnack
MANUFACTURED BY: NutriSnack Foods LLP, Phase 2, Okhla, New Delhi - 110020
NET QUANTITY: 250 g
COUNTRY OF ORIGIN: India
CONSUMER CARE: support@nutrisnack.in
    """.strip()

    NON_COMPLIANT_MISSING_ORIGIN_AND_QTY = """
PRODUCT: Imported Choco Wafers
BRAND: SweetBite
MANUFACTURED BY: SweetBite Confectioneries, Belgium
MRP: Rs. 299.00 (INCLUSIVE OF ALL TAXES)
CONSUMER CARE: help@sweetbite.com
    """.strip()

    NEEDS_REVIEW_BLURRY = """
PR..UCT: Sun... Fl..wer Oil
BR..D: Gol...Drop
MFD.. BY: Un...d Oils
NET ..: 1 L
M.P: Rs. 1..00
    """.strip()

    def __init__(self, default_text: str = None, default_confidence: float = 0.94):
        self.default_text = default_text or self.DEFAULT_COMPLIANT_LABEL
        self.default_confidence = default_confidence

    def extract_text(self, image_data: Union[bytes, str, Path]) -> OCRResult:
        # Check if the filename or path gives a test hint
        identifier = str(image_data) if isinstance(image_data, (str, Path)) else ""

        if "missing_mrp" in identifier.lower():
            text = self.NON_COMPLIANT_MISSING_MRP
            confidence = 0.92
        elif "missing_origin" in identifier.lower():
            text = self.NON_COMPLIANT_MISSING_ORIGIN_AND_QTY
            confidence = 0.88
        elif "blurry" in identifier.lower() or "low_conf" in identifier.lower():
            text = self.NEEDS_REVIEW_BLURRY
            confidence = 0.55
        else:
            text = self.default_text
            confidence = self.default_confidence

        # Generate mock bounding box detections for line items
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        detections: List[Dict[str, Any]] = []
        
        y_offset = 20
        for i, line in enumerate(lines):
            detections.append({
                "box": [[10, y_offset], [400, y_offset], [400, y_offset + 25], [10, y_offset + 25]],
                "text": line,
                "confidence": confidence,
            })
            y_offset += 30

        return OCRResult(
            text=text,
            confidence=confidence,
            raw_detections=detections,
        )
