import logging
from typing import List, Optional
from app.schemas.inspection import (
    ComplianceResult,
    ComplianceFinding,
    ComplianceOverallStatus,
    RuleStatus,
    RuleSeverity,
    ExtractedProductData,
    RuleDefinition,
)
from app.services.compliance.registry import default_rule_registry, RuleRegistry
from app.services.compliance.evaluator import RuleEvaluator

logger = logging.getLogger(__name__)


class ComplianceEngine:
    """
    Upgraded Compliance Engine for Legal Metrology (Packaged Commodities) Rules, 2011.
    Source-backed, versioned, configurable, and traceable.
    Evaluates enabled rules from RuleRegistry against structured product data and OCR text.
    """

    def __init__(
        self,
        registry: Optional[RuleRegistry] = None,
        rules: Optional[List[RuleDefinition]] = None,
    ):
        self.registry = registry or default_rule_registry
        self.rules = rules if rules is not None else self.registry.get_enabled_rules()

    def evaluate(
        self,
        product: ExtractedProductData,
        ocr_text: str,
        ocr_confidence: float = 0.9,
        raw_detections: Optional[list] = None,
    ) -> ComplianceResult:
        """
        Evaluates extracted product data against active compliance rules.
        Calculates findings, overall status, and combined confidence score.
        """
        findings: List[ComplianceFinding] = []
        has_error_failures = False
        warning_count = 0
        not_checked_count = 0
        pass_count = 0

        for rule in self.rules:
            finding = RuleEvaluator.evaluate_rule(
                rule=rule,
                product=product,
                ocr_text=ocr_text,
                ocr_confidence=ocr_confidence,
            )
            findings.append(finding)

            if finding.status == RuleStatus.FAIL:
                if finding.severity == RuleSeverity.ERROR:
                    has_error_failures = True
            elif finding.status == RuleStatus.WARNING:
                warning_count += 1
            elif finding.status == RuleStatus.NOT_CHECKED:
                not_checked_count += 1
            elif finding.status == RuleStatus.PASS:
                pass_count += 1

        # -------------------------------------------------------------
        # Overall Status Determination Logic:
        # 1. Any reliable ERROR-severity rule failure -> NON_COMPLIANT
        # 2. Low OCR confidence (< 0.60), multiple NOT_CHECKED/uncertainties, or high warnings -> NEEDS_REVIEW
        # 3. All evaluated applicable checks pass -> COMPLIANT
        # -------------------------------------------------------------
        if ocr_confidence < 0.60 or not_checked_count >= 2:
            overall_status = ComplianceOverallStatus.NEEDS_REVIEW
        elif has_error_failures:
            overall_status = ComplianceOverallStatus.NON_COMPLIANT
        elif warning_count >= 3 or (pass_count < 3 and ocr_confidence < 0.75):
            overall_status = ComplianceOverallStatus.NEEDS_REVIEW
        else:
            overall_status = ComplianceOverallStatus.COMPLIANT

        # Calculate combined confidence score (OCR confidence + rule pass ratio)
        total_rules = len(self.rules)
        rule_score = (pass_count + (0.5 * warning_count)) / total_rules if total_rules > 0 else 1.0
        combined_confidence = round(0.7 * ocr_confidence + 0.3 * rule_score, 4)
        combined_confidence = max(0.0, min(1.0, combined_confidence))

        # Calculate readability analysis under Rule 9 & Schedule II
        readability = RuleEvaluator.analyze_readability(
            ocr_text=ocr_text,
            ocr_confidence=ocr_confidence,
            product=product,
            raw_detections=raw_detections,
        )

        return ComplianceResult(
            overall_status=overall_status,
            confidence=combined_confidence,
            product=product,
            readability=readability,
            ocr_text=ocr_text,
            findings=findings,
        )

