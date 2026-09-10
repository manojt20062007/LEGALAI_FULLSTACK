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

    def _is_exempt(self, product: ExtractedProductData) -> bool:
        """Rule 26 Exemptions: <10g, <10ml, or >50kg."""
        if not product.net_quantity:
            return False
            
        nq = product.net_quantity.lower().replace(" ", "")
        try:
            import re
            match = re.match(r'^([\d\.]+)(g|ml|kg|l)$', nq)
            if match:
                val = float(match.group(1))
                unit = match.group(2)
                if unit in ['g', 'ml'] and val <= 10:
                    return True
                if unit == 'kg' and val > 50:
                    return True
        except Exception:
            pass
        return False

    def _check_standard_pack_size(self, product: ExtractedProductData, ocr_text: str) -> Optional[ComplianceFinding]:
        """Rule 5 & Second Schedule: Standard Package Sizes."""
        if not product.product_name or not product.net_quantity:
            return None
            
        name = product.product_name.lower()
        nq = product.net_quantity.lower().replace(" ", "")
        
        # Simple PoC for Biscuits (Second Schedule Item 3)
        if "biscuit" in name:
            try:
                import re
                match = re.match(r'^([\d\.]+)(g|kg)$', nq)
                if match:
                    val = float(match.group(1))
                    unit = match.group(2)
                    
                    if unit == 'g':
                        standard_g = [25, 50, 75, 100, 150, 200, 250, 300]
                        is_standard = val in standard_g or (val > 300 and val <= 1000 and val % 100 == 0)
                    else: # kg
                        is_standard = (val * 1000) % 100 == 0
                        
                    if not is_standard:
                        # Non-standard pack must have a declaration
                        if "not a standard pack size" not in ocr_text.lower():
                            return ComplianceFinding(
                                rule_id="LM-PC-RULE-5",
                                field="net_quantity",
                                status=RuleStatus.FAIL,
                                severity=RuleSeverity.ERROR,
                                message=f"Biscuits must be packed in standard sizes (e.g. 50g, 100g) or bear a 'Not a standard pack size' declaration. Found: {product.net_quantity}."
                            )
            except Exception:
                pass
        return None

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
        is_exempt = self._is_exempt(product)
        
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
        
        rule5_finding = self._check_standard_pack_size(product, ocr_text)
        if rule5_finding:
            findings.append(rule5_finding)
            has_error_failures = True

        if is_exempt:
            overall_status = ComplianceOverallStatus.COMPLIANT
        elif ocr_confidence < 0.60 or not_checked_count >= 2:
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

        if is_exempt:
            findings.insert(0, ComplianceFinding(
                rule_id="LM-PC-EXEMPT",
                field="net_quantity",
                status=RuleStatus.PASS,
                severity=RuleSeverity.INFO,
                message="Package is exempt from Rule 6 declarations under Rule 26 (Quantity <= 10g/ml or > 50kg)."
            ))

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

