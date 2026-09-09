import io
import uuid
import pytest
from fastapi import status
from app.db.models import Inspection
from app.schemas.inspection import (
    InspectionStatus,
    ComplianceResult,
    ComplianceOverallStatus,
    ExtractedProductData,
    ComplianceFinding,
    RuleStatus,
    RuleSeverity,
)


@pytest.mark.asyncio
async def test_health_check(async_client):
    response = await async_client.get("/health")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data


@pytest.mark.asyncio
async def test_upload_invalid_extension(async_client):
    response = await async_client.post(
        "/api/v1/inspections",
        files={"image": ("test.txt", b"plain text content", "text/plain")},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Unsupported file extension" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_corrupted_image(async_client):
    response = await async_client.post(
        "/api/v1/inspections",
        files={"image": ("corrupt.jpg", b"not a real jpeg binary data", "image/jpeg")},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "corrupted or not a valid image" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_empty_file(async_client):
    response = await async_client.post(
        "/api/v1/inspections",
        files={"image": ("empty.jpg", b"", "image/jpeg")},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "empty" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_inspection_success(async_client, synthetic_label_image_bytes):
    response = await async_client.post(
        "/api/v1/inspections",
        files={"image": ("sample_label.jpg", synthetic_label_image_bytes, "image/jpeg")},
    )
    assert response.status_code == status.HTTP_202_ACCEPTED
    data = response.json()
    assert "id" in data
    assert data["status"] in ["queued", "completed", "processing"]
    assert "created_at" in data

    # Fetch detail
    insp_id = data["id"]
    get_res = await async_client.get(f"/api/v1/inspections/{insp_id}")
    assert get_res.status_code == status.HTTP_200_OK
    detail = get_res.json()
    assert detail["id"] == insp_id
    assert "image_url" in detail


@pytest.mark.asyncio
async def test_get_nonexistent_inspection(async_client):
    random_id = str(uuid.uuid4())
    response = await async_client.get(f"/api/v1/inspections/{random_id}")
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "not found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_report_in_progress(async_client, db_session):
    insp_id = str(uuid.uuid4())
    insp = Inspection(
        id=insp_id,
        status="processing",
        image_path="test.jpg",
    )
    db_session.add(insp)
    db_session.commit()

    response = await async_client.get(f"/api/v1/inspections/{insp_id}/report")
    assert response.status_code == status.HTTP_409_CONFLICT
    assert "still in progress" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_report_failed_inspection(async_client, db_session):
    insp_id = str(uuid.uuid4())
    insp = Inspection(
        id=insp_id,
        status="failed",
        image_path="test.jpg",
        error_message="Image corrupted or unreadable.",
    )
    db_session.add(insp)
    db_session.commit()

    response = await async_client.get(f"/api/v1/inspections/{insp_id}/report")
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "Cannot generate report for failed inspection" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_report_completed_inspection(async_client, db_session):
    insp_id = str(uuid.uuid4())
    comp_result = ComplianceResult(
        overall_status=ComplianceOverallStatus.COMPLIANT,
        confidence=0.92,
        product=ExtractedProductData(
            product_name="Pure Coconut Water",
            brand="CocoFresh",
            manufacturer="CocoFresh Agri Ltd",
            mrp="₹40.00",
            net_quantity="200",
            unit="ml",
            country_of_origin="India",
            consumer_care="support@cocofresh.in",
        ),
        ocr_text="SAMPLE OCR TEXT",
        findings=[
            ComplianceFinding(
                rule_id="RULE-MRP-PRESENT",
                field="mrp",
                status=RuleStatus.PASS,
                severity=RuleSeverity.ERROR,
                message="MRP is clearly declared: ₹40.00",
            )
        ],
    )
    insp = Inspection(
        id=insp_id,
        status="completed",
        image_path="test.jpg",
        compliance_result=comp_result.model_dump(),
    )
    db_session.add(insp)
    db_session.commit()

    # Request HTML Report
    html_res = await async_client.get(f"/api/v1/inspections/{insp_id}/report?format=html")
    assert html_res.status_code == status.HTTP_200_OK
    assert "text/html" in html_res.headers["content-type"]
    assert "LM-Verify" in html_res.text
    assert "Automated Preliminary Assessment" in html_res.text

    # Request PDF Report (falls back to HTML/PDF binary)
    pdf_res = await async_client.get(f"/api/v1/inspections/{insp_id}/report?format=pdf")
    assert pdf_res.status_code == status.HTTP_200_OK
    assert len(pdf_res.content) > 0
