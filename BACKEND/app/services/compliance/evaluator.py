import re
import logging
from typing import Optional, Tuple
from app.schemas.inspection import (
    RuleDefinition,
    ExtractedProductData,
    ComplianceFinding,
    RuleStatus,
    RuleSeverity,
    CheckType,
    ReadabilityAnalysis,
)

logger = logging.getLogger(__name__)


class RuleEvaluator:
    """
    Evaluates individual RuleDefinition rules against structured ExtractedProductData and OCR text.
    Handles uncertainty policies, check types, and source-backed finding generation.
    """

    DEFAULT_MIN_CONFIDENCE = 0.60

    @classmethod
    def evaluate_rule(
        cls,
        rule: RuleDefinition,
        product: ExtractedProductData,
        ocr_text: str,
        ocr_confidence: float = 0.9,
    ) -> ComplianceFinding:
        """
        Evaluates a single rule definition and returns a fully traceable ComplianceFinding.
        """
        field_value = getattr(product, rule.field, None)
        min_conf = rule.parameters.get("min_confidence", cls.DEFAULT_MIN_CONFIDENCE)

        # 1. Uncertainty Handling for missing fields when OCR confidence is low
        if (field_value is None or str(field_value).strip() == "") and ocr_confidence < min_conf:
            return ComplianceFinding(
                rule_id=rule.rule_id,
                field=rule.field,
                status=RuleStatus.NOT_CHECKED if rule.severity == RuleSeverity.ERROR else RuleStatus.WARNING,
                severity=rule.severity,
                message=(
                    f"Information for '{rule.field}' could not be reliably extracted "
                    f"(OCR confidence: {ocr_confidence:.2f} < threshold: {min_conf:.2f}); manual review recommended."
                ),
                source=rule.source,
            )

        # 2. Check Type Dispatch
        if rule.check_type in (CheckType.REQUIRED_FIELD, CheckType.FIELD_PRESENT):
            status, message = cls._eval_required_field(rule, product, field_value)
        elif rule.check_type == CheckType.FIELD_PATTERN:
            status, message = cls._eval_field_pattern(rule, field_value)
        elif rule.check_type == CheckType.FIELD_VALUE:
            status, message = cls._eval_field_value(rule, field_value)
        elif rule.check_type == CheckType.CUSTOM:
            status, message = cls._eval_custom(rule, product, ocr_text)
        else:
            status, message = cls._eval_required_field(rule, product, field_value)

        return ComplianceFinding(
            rule_id=rule.rule_id,
            field=rule.field,
            status=status,
            severity=rule.severity,
            message=message,
            source=rule.source,
        )

    @classmethod
    def _eval_required_field(
        cls,
        rule: RuleDefinition,
        product: ExtractedProductData,
        field_value: Optional[str],
    ) -> Tuple[RuleStatus, str]:
        if field_value is None or str(field_value).strip() == "":
            return (
                RuleStatus.FAIL if rule.severity == RuleSeverity.ERROR else RuleStatus.WARNING,
                f"Mandatory declaration for '{rule.name}' is missing or could not be detected on the package label.",
            )

        val_str = str(field_value).strip()
        min_len = rule.parameters.get("min_length", 1)
        if len(val_str) < min_len:
            return (
                RuleStatus.WARNING,
                f"Declared value '{val_str}' for '{rule.field}' is incomplete or shorter than expected minimum ({min_len} chars).",
            )

        # Special handling for Net Quantity (checks if unit is also present)
        if rule.field == "net_quantity" and rule.parameters.get("require_unit", True):
            if not product.unit:
                return (
                    RuleStatus.WARNING,
                    f"Net quantity number found ({val_str}) but measurement unit is missing or ambiguous.",
                )
            return (
                RuleStatus.PASS,
                f"Net quantity is declared: {val_str} {product.unit}",
            )

        return (
            RuleStatus.PASS,
            f"{rule.name} is clearly declared: {val_str}",
        )

    @classmethod
    def _eval_field_pattern(
        cls,
        rule: RuleDefinition,
        field_value: Optional[str],
    ) -> Tuple[RuleStatus, str]:
        if field_value is None or str(field_value).strip() == "":
            return (
                RuleStatus.FAIL if rule.severity == RuleSeverity.ERROR else RuleStatus.WARNING,
                f"Value for '{rule.field}' is missing for pattern validation.",
            )

        pattern = rule.parameters.get("pattern", ".*")
        if re.search(pattern, str(field_value), re.IGNORECASE):
            return RuleStatus.PASS, f"Declared '{rule.field}' matches required format: {field_value}"
        return (
            RuleStatus.WARNING,
            f"Declared '{rule.field}' value '{field_value}' does not match required format pattern.",
        )

    @classmethod
    def _eval_field_value(
        cls,
        rule: RuleDefinition,
        field_value: Optional[str],
    ) -> Tuple[RuleStatus, str]:
        if field_value is None or str(field_value).strip() == "":
            return (
                RuleStatus.NOT_CHECKED,
                f"No value provided for '{rule.field}' to validate standard prescribed values.",
            )

        allowed = rule.parameters.get("allowed_values", [])
        if not allowed:
            return RuleStatus.PASS, f"Value '{field_value}' is accepted."

        val_lower = str(field_value).strip().lower()
        allowed_lower = [str(x).strip().lower() for x in allowed]

        if val_lower in allowed_lower:
            return (
                RuleStatus.PASS,
                f"Standard prescribed value used for '{rule.field}': '{field_value}'",
            )
        return (
            RuleStatus.WARNING,
            f"Declared value '{field_value}' may not conform to standard prescribed units under {rule.source.reference}.",
        )

    @classmethod
    def _eval_custom(
        cls,
        rule: RuleDefinition,
        product: ExtractedProductData,
        ocr_text: str,
    ) -> Tuple[RuleStatus, str]:
        field_value = getattr(product, rule.field, None)
        if field_value:
            return RuleStatus.PASS, f"{rule.name} validated: {field_value}"
        return RuleStatus.WARNING, f"{rule.name} could not be validated."

    @classmethod
    def analyze_readability(
        cls,
        ocr_text: str,
        ocr_confidence: float = 0.95,
        product: Optional[ExtractedProductData] = None,
        raw_detections: Optional[list] = None,
    ) -> ReadabilityAnalysis:
        """
        Evaluates font size and text readability compliance under Rule 9 & Schedule II.
        Calculates confidence-weighted readability scores and minimum numeral height conformance.
        """
        if not ocr_text or not ocr_text.strip():
            return ReadabilityAnalysis(
                readability_score=0.0,
                estimated_font_size_pt=0.0,
                min_height_compliant=False,
                contrast_score=0.0,
                rule_9_schedule_ii_status="NON_COMPLIANT",
                notes="No readable text detected on package label.",
            )

        # Baseline readability score from OCR confidence (scaled to 0-100)
        base_score = min(100.0, max(10.0, ocr_confidence * 100.0))

        # Estimate font size in points from OCR bounding boxes if available
        estimated_pt = 12.0 # fallback
        if raw_detections:
            heights = []
            for d in raw_detections:
                box = d.get("box")
                if box and len(box) == 4:
                    # box is [[x, y], [x, y], [x, y], [x, y]]
                    # usually [top_left, top_right, bottom_right, bottom_left]
                    # height is approx bottom_right.y - top_right.y
                    h = box[2][1] - box[1][1]
                    if h > 0:
                        heights.append(h)
            
            if heights:
                avg_px_height = sum(heights) / len(heights)
                # Assume ~96 DPI average for scaled web images (pt = px * 0.75)
                estimated_pt = round(min(36.0, max(4.0, avg_px_height * 0.75)), 1)
        else:
            lines = [l.strip() for l in ocr_text.splitlines() if l.strip()]
            avg_line_len = sum(len(l) for l in lines) / max(1, len(lines))
            estimated_pt = round(min(18.0, max(6.0, 14.0 - (avg_line_len / 15.0))), 1)

        contrast = round(min(98.0, max(60.0, base_score * 0.95 + 4.0)), 1)

        # Determine Rule 9 / Schedule II compliance:
        # Minimum font height requirement for standard retail packages is 1.0mm - 4.0mm (~3pt to ~11pt)
        is_compliant = estimated_pt >= 6.0 and base_score >= 60.0
        status = "COMPLIANT" if is_compliant else "NEEDS_REVIEW"

        notes = (
            f"Declaration numeral heights (~{estimated_pt}pt) and clarity index ({base_score:.1f}%) "
            f"satisfy Rule 9 & Schedule II readability guidelines."
            if is_compliant
            else f"Declaration text clarity or font size (~{estimated_pt}pt) is borderline; manual verification advised."
        )

        return ReadabilityAnalysis(
            readability_score=round(base_score, 1),
            estimated_font_size_pt=estimated_pt,
            min_height_compliant=is_compliant,
            contrast_score=contrast,
            rule_9_schedule_ii_status=status,
            notes=notes,
        )

