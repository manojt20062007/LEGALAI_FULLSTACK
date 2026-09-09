import uuid
from app.services.extraction.extractor import LabelExtractor
from app.services.compliance.engine import ComplianceEngine
from app.schemas.inspection import (
    ComplianceOverallStatus,
    RuleStatus,
    RuleSeverity,
    ExtractedProductData,
)
from app.workers.tasks import process_inspection
from app.db.models import Inspection
from app.services.storage import get_storage_service


def test_label_extractor_full_compliant_text():
    sample_text = """
    PRODUCT: Organic Green Tea
    BRAND: PureLeaf
    MANUFACTURED BY: PureLeaf Organics Pvt Ltd, Industrial Estate, Pune - 411001
    NET QUANTITY: 250 g
    MRP: Rs. 240.00 (INCL. OF ALL TAXES)
    COUNTRY OF ORIGIN: India
    CONSUMER CARE: care@pureleaf.in / 1800-111-222
    """
    extracted = LabelExtractor.extract_fields(sample_text)
    
    assert extracted.mrp == "₹240.00"
    assert extracted.net_quantity == "250"
    assert extracted.unit == "g"
    assert "PureLeaf Organics" in extracted.manufacturer
    assert "India" in extracted.country_of_origin
    assert "care@pureleaf.in" in extracted.consumer_care
    assert "Organic Green Tea" in extracted.product_name


def test_label_extractor_partial_missing_fields():
    sample_text = """
    ITEM: Roasted Cashews
    NET WEIGHT: 500 grams
    MFG BY: Cashew King, Goa
    """
    extracted = LabelExtractor.extract_fields(sample_text)
    
    assert extracted.mrp is None
    assert extracted.net_quantity == "500"
    assert extracted.unit == "g"
    assert extracted.country_of_origin is None
    assert extracted.consumer_care is None


def test_compliance_engine_compliant():
    engine = ComplianceEngine()
    product = ExtractedProductData(
        product_name="Himalayan Mineral Water",
        brand="AquaPure",
        manufacturer="AquaPure Pvt Ltd, Uttarakhand",
        mrp="₹20.00",
        net_quantity="1",
        unit="l",
        country_of_origin="India",
        consumer_care="support@aquapure.com",
        mfg_date="03/2026",
    )
    result = engine.evaluate(product=product, ocr_text="SAMPLE OCR", ocr_confidence=0.95)
    
    assert result.overall_status == ComplianceOverallStatus.COMPLIANT
    assert result.confidence >= 0.85
    assert len(result.findings) >= 8

    # Check that mandatory checks passed
    mrp_finding = next(f for f in result.findings if f.field == "mrp" or f.rule_id == "LM-PC-001")
    assert mrp_finding.status == RuleStatus.PASS
    assert mrp_finding.severity == RuleSeverity.ERROR


def test_compliance_engine_non_compliant_missing_mrp():
    engine = ComplianceEngine()
    product = ExtractedProductData(
        product_name="Almond Crunch",
        brand="NutriSnack",
        manufacturer="NutriSnack Foods, Delhi",
        mrp=None,  # Missing MRP
        net_quantity="100",
        unit="g",
        country_of_origin="India",
        consumer_care="help@nutrisnack.com",
    )
    result = engine.evaluate(product=product, ocr_text="SAMPLE OCR", ocr_confidence=0.92)
    
    assert result.overall_status == ComplianceOverallStatus.NON_COMPLIANT
    mrp_finding = next(f for f in result.findings if f.field == "mrp" or f.rule_id == "LM-PC-001")
    assert mrp_finding.status == RuleStatus.FAIL


def test_compliance_engine_needs_review_low_confidence():
    engine = ComplianceEngine()
    product = ExtractedProductData(
        product_name="Blurry Product",
        brand="Blurry",
        manufacturer="Blurry Manufacturer",
        mrp="₹50.00",
        net_quantity="100",
        unit="g",
        country_of_origin="India",
        consumer_care="care@blurry.com",
    )
    # Very low OCR confidence (e.g. 0.45)
    result = engine.evaluate(product=product, ocr_text="BLURRY OCR", ocr_confidence=0.45)
    assert result.overall_status == ComplianceOverallStatus.NEEDS_REVIEW


def test_process_inspection_worker_success(db_session, synthetic_label_image_bytes):
    # Save image to storage
    storage = get_storage_service()
    filename = f"test_{uuid.uuid4()}.jpg"
    storage_path = storage.upload(synthetic_label_image_bytes, filename)

    insp_id = str(uuid.uuid4())
    insp = Inspection(
        id=insp_id,
        status="queued",
        image_path=storage_path,
    )
    db_session.add(insp)
    db_session.commit()

    # Run processing task directly
    task_res = process_inspection(insp_id)
    assert task_res["status"] == "completed"

    # Verify updated record
    db_session.expire_all()
    updated_insp = db_session.query(Inspection).filter(Inspection.id == insp_id).first()
    assert updated_insp.status == "completed"
    assert updated_insp.ocr_text is not None
    assert updated_insp.extracted_data is not None
    assert updated_insp.compliance_result is not None


def test_process_inspection_worker_missing_file(db_session):
    insp_id = str(uuid.uuid4())
    insp = Inspection(
        id=insp_id,
        status="queued",
        image_path="non_existent_file_path_12345.jpg",
    )
    db_session.add(insp)
    db_session.commit()

    task_res = process_inspection(insp_id)
    assert task_res["status"] == "failed"

    db_session.expire_all()
    updated_insp = db_session.query(Inspection).filter(Inspection.id == insp_id).first()
    assert updated_insp.status == "failed"
    assert "Unable to retrieve uploaded image" in updated_insp.error_message
