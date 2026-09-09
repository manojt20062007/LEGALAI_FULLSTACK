import pytest
from app.schemas.inspection import (
    RuleDefinition,
    RuleSource,
    CheckType,
    RuleSeverity,
    RuleStatus,
    ComplianceOverallStatus,
    ExtractedProductData,
)
from app.services.compliance.registry import RuleRegistry, default_rule_registry
from app.services.compliance.evaluator import RuleEvaluator
from app.services.compliance.engine import ComplianceEngine


def test_rule_loading_and_validation():
    """Verify that rules load correctly from JSON and validate schema."""
    rules = default_rule_registry.get_all_rules()
    assert len(rules) >= 7
    for rule in rules:
        assert isinstance(rule, RuleDefinition)
        assert rule.rule_id.startswith("LM-PC-")
        assert rule.source is not None
        assert rule.source.document == "Legal Metrology (Packaged Commodities) Rules, 2011"
        assert rule.source.reference is not None


def test_rule_registry_get_rule():
    """Verify direct rule lookup and legacy alias resolution."""
    rule_mrp = default_rule_registry.get_rule("LM-PC-001")
    assert rule_mrp is not None
    assert rule_mrp.field == "mrp"
    assert rule_mrp.severity == RuleSeverity.ERROR

    # Legacy alias lookup
    rule_legacy = default_rule_registry.get_rule("RULE-MRP-PRESENT")
    assert rule_legacy is not None
    assert rule_legacy.rule_id == "LM-PC-001"


def test_rule_evaluator_pass():
    """Test rule evaluator with valid product data."""
    rule = default_rule_registry.get_rule("LM-PC-001")
    product = ExtractedProductData(mrp="₹150.00")
    
    finding = RuleEvaluator.evaluate_rule(rule=rule, product=product, ocr_text="MRP Rs 150", ocr_confidence=0.95)
    assert finding.status == RuleStatus.PASS
    assert finding.severity == RuleSeverity.ERROR
    assert "clearly declared" in finding.message
    # Traceability check
    assert finding.source is not None
    assert finding.source.reference == "Rule 6(1)(e)"
    assert finding.source.document == "Legal Metrology (Packaged Commodities) Rules, 2011"


def test_rule_evaluator_fail_mandatory():
    """Test rule evaluator with missing mandatory field."""
    rule = default_rule_registry.get_rule("LM-PC-001")
    product = ExtractedProductData(mrp=None)
    
    finding = RuleEvaluator.evaluate_rule(rule=rule, product=product, ocr_text="No price text", ocr_confidence=0.90)
    assert finding.status == RuleStatus.FAIL
    assert finding.severity == RuleSeverity.ERROR
    assert "missing" in finding.message.lower()
    assert finding.source.reference == "Rule 6(1)(e)"


def test_rule_evaluator_low_confidence_uncertainty():
    """Test uncertainty handling: missing field with low OCR confidence returns NOT_CHECKED / WARNING rather than FAIL."""
    rule = default_rule_registry.get_rule("LM-PC-001")
    product = ExtractedProductData(mrp=None)
    
    # OCR confidence is 0.40 (< 0.60 threshold)
    finding = RuleEvaluator.evaluate_rule(rule=rule, product=product, ocr_text="blurry text", ocr_confidence=0.40)
    assert finding.status == RuleStatus.NOT_CHECKED
    assert "could not be reliably extracted" in finding.message
    assert finding.source is not None


def test_rule_evaluator_field_value_check():
    """Test standard metric unit verification rule."""
    rule = default_rule_registry.get_rule("LM-PC-006")
    
    # Standard unit
    valid_product = ExtractedProductData(unit="kg")
    finding_pass = RuleEvaluator.evaluate_rule(rule=rule, product=valid_product, ocr_text="", ocr_confidence=0.9)
    assert finding_pass.status == RuleStatus.PASS

    # Non-standard unit
    invalid_product = ExtractedProductData(unit="pounds")
    finding_warn = RuleEvaluator.evaluate_rule(rule=rule, product=invalid_product, ocr_text="", ocr_confidence=0.9)
    assert finding_warn.status == RuleStatus.WARNING


def test_compliance_engine_full_compliant_flow():
    """Test complete engine evaluation with a fully compliant product."""
    engine = ComplianceEngine()
    product = ExtractedProductData(
        product_name="Organic Basmati Rice",
        brand="PureGrain",
        manufacturer="PureGrain Millers India Pvt. Ltd., Karnal, Haryana - 132001",
        mrp="₹180.00",
        net_quantity="1",
        unit="kg",
        country_of_origin="India",
        consumer_care="care@puregrain.in / 1800-111-2222",
        mfg_date="01/2026",
    )
    result = engine.evaluate(product=product, ocr_text="SAMPLE OCR TEXT", ocr_confidence=0.94)

    assert result.overall_status == ComplianceOverallStatus.COMPLIANT
    assert result.confidence >= 0.85
    assert len(result.findings) >= 8
    assert result.readability is not None
    assert result.readability.min_height_compliant is True

    # Ensure all findings contain source traceability
    for finding in result.findings:
        assert finding.source is not None
        assert finding.source.document == "Legal Metrology (Packaged Commodities) Rules, 2011"
        assert finding.source.reference is not None


def test_compliance_engine_non_compliant_missing_origin():
    """Test engine evaluation where country of origin is missing."""
    engine = ComplianceEngine()
    product = ExtractedProductData(
        product_name="Imported Cookies",
        brand="BakeHouse",
        manufacturer="BakeHouse Global, London",
        mrp="₹350.00",
        net_quantity="300",
        unit="g",
        country_of_origin=None,  # Missing origin
        consumer_care="support@bakehouse.com",
    )
    result = engine.evaluate(product=product, ocr_text="SAMPLE OCR TEXT", ocr_confidence=0.90)

    assert result.overall_status == ComplianceOverallStatus.NON_COMPLIANT
    origin_finding = next(f for f in result.findings if f.field == "country_of_origin")
    assert origin_finding.status == RuleStatus.FAIL
    assert origin_finding.source.reference.startswith("Rule 6(10)")


def test_compliance_engine_needs_review_on_low_confidence():
    """Test engine evaluation when OCR confidence is low."""
    engine = ComplianceEngine()
    product = ExtractedProductData(
        product_name="Sample Product",
        mrp=None,
    )
    # OCR confidence = 0.50
    result = engine.evaluate(product=product, ocr_text="UNREADABLE OCR", ocr_confidence=0.50)
    assert result.overall_status == ComplianceOverallStatus.NEEDS_REVIEW
