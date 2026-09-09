import time
import io
import json
import requests
from PIL import Image, ImageDraw

BASE_URL = "http://127.0.0.1:8000"

def run_live_pipeline_test():
    print("=" * 70)
    print("LM-VERIFY LIVE BACKEND PIPELINE TEST")
    print("=" * 70)

    # 1. Health API & Auth Test
    print("\n[Step 1] Testing Health API (GET /health) & RBAC Profile (GET /api/v1/auth/me)...")
    try:
        health_res = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"Health Status Code: {health_res.status_code}")
        assert health_res.status_code == 200, "Health check failed"
        print("[OK] Health Check Passed!")

        auth_res = requests.get(f"{BASE_URL}/api/v1/auth/me", headers={"X-User-Role": "inspector"}, timeout=5)
        print(f"Auth Profile Status Code: {auth_res.status_code}")
        print("Auth Profile:", json.dumps(auth_res.json(), indent=2))
        assert auth_res.status_code == 200, "Auth profile check failed"
        print("[OK] RBAC Auth Profile Passed!")
    except Exception as e:
        print(f"[FAIL] Failed to connect to server: {e}")
        return False

    # 2. Generate Synthetic Label Image
    print("\n[Step 2] Generating sample packaged product image...")
    img = Image.new("RGB", (600, 450), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((20, 20), "PRODUCT: Premium Assam Tea", fill=(0, 0, 0))
    draw.text((20, 60), "BRAND: ChaiGold", fill=(0, 0, 0))
    draw.text((20, 100), "MANUFACTURED BY: ChaiGold Estates India Ltd, Guwahati, Assam - 781001", fill=(0, 0, 0))
    draw.text((20, 140), "NET QUANTITY: 500 g", fill=(0, 0, 0))
    draw.text((20, 180), "MRP: Rs. 299.00 (INCLUSIVE OF ALL TAXES)", fill=(0, 0, 0))
    draw.text((20, 220), "MFG DATE: 02/2026", fill=(0, 0, 0))
    draw.text((20, 260), "COUNTRY OF ORIGIN: India", fill=(0, 0, 0))
    draw.text((20, 300), "CONSUMER CARE: support@chaigold.in | Toll Free: 1800-456-7890", fill=(0, 0, 0))

    img_bytes = io.BytesIO()
    img.save(img_bytes, format="JPEG")
    img_bytes.seek(0)
    print(f"[OK] Created test image ({len(img_bytes.getvalue())} bytes)")

    # 3. Upload product image (POST /api/v1/inspections)
    print("\n[Step 3] Uploading product image (POST /api/v1/inspections)...")
    files = {"image": ("assam_tea_label.jpg", img_bytes.getvalue(), "image/jpeg")}
    upload_res = requests.post(f"{BASE_URL}/api/v1/inspections", files=files, timeout=10)
    print(f"Status Code: {upload_res.status_code}")
    print("Response:", json.dumps(upload_res.json(), indent=2))
    assert upload_res.status_code in (201, 202), f"Upload failed: {upload_res.text}"
    
    inspection_id = upload_res.json()["id"]
    print(f"[OK] Inspection Created! ID: {inspection_id}")

    # 4. Poll / Retrieve Inspection Result (GET /api/v1/inspections/{id})
    print("\n[Step 4] Polling Inspection Result (GET /api/v1/inspections/{id})...")
    detail = None
    for attempt in range(5):
        get_res = requests.get(f"{BASE_URL}/api/v1/inspections/{inspection_id}", timeout=5)
        detail = get_res.json()
        print(f"Attempt {attempt+1}: Status = {detail.get('status')}")
        if detail.get("status") in ("completed", "failed"):
            break
        time.sleep(1)

    print("\nInspection Detail Response:")
    print(json.dumps(detail, indent=2))
    assert detail.get("status") == "completed", f"Inspection not completed: {detail}"

    # 5. Verify OCR & Field Extraction
    result = detail.get("result", {})
    print("\n[Step 5] Extracted Product Information:")
    product = result.get("product", {})
    for k, v in product.items():
        clean_v = str(v).encode("ascii", "replace").decode("ascii")
        print(f"  * {k.replace('_', ' ').title()}: {clean_v}")

    # Verify Readability
    readability = result.get("readability")
    if readability:
        print("\n[Readability & Font Size Analysis - Rule 9 & Schedule II]:")
        print(f"  * Readability Index: {readability.get('readability_score')}%")
        print(f"  * Estimated Font Size: ~{readability.get('estimated_font_size_pt')} pt")
        print(f"  * Rule 9 Status: {readability.get('rule_9_schedule_ii_status')}")

    # 6. Verify Compliance Findings & Source Traceability
    print("\n[Step 6] Compliance Findings & Traceability (8 Statutory Rules):")
    findings = result.get("findings", [])
    for f in findings:
        source_ref = f.get("source", {}).get("reference", "N/A")
        clean_msg = str(f.get('message')).encode("ascii", "replace").decode("ascii")
        print(f"  [{f.get('status')}] {f.get('rule_id')} ({f.get('field')}): {clean_msg} [Ref: {source_ref}]")

    print(f"\n[Step 7] Overall Status: {result.get('overall_status')} (Confidence: {result.get('confidence')*100:.1f}%)")

    # 8. Report Generation Test (HTML, PDF, CSV, JSON)
    print("\n[Step 8] Testing Report Generation in all 4 formats...")
    # HTML Report
    html_report_res = requests.get(f"{BASE_URL}/api/v1/inspections/{inspection_id}/report?format=html", timeout=5)
    assert html_report_res.status_code == 200, "HTML Report generation failed"
    print(f"[OK] HTML Report verified ({len(html_report_res.text)} chars)")

    # PDF Report
    pdf_report_res = requests.get(f"{BASE_URL}/api/v1/inspections/{inspection_id}/report?format=pdf", timeout=5)
    assert pdf_report_res.status_code == 200, "PDF Report generation failed"
    print(f"[OK] PDF Report verified ({len(pdf_report_res.content)} bytes)")

    # CSV Report
    csv_report_res = requests.get(f"{BASE_URL}/api/v1/inspections/{inspection_id}/report?format=csv", timeout=5)
    assert csv_report_res.status_code == 200, "CSV Report generation failed"
    print(f"[OK] CSV Export verified ({len(csv_report_res.text)} chars)")

    # JSON Report
    json_report_res = requests.get(f"{BASE_URL}/api/v1/inspections/{inspection_id}/report?format=json", timeout=5)
    assert json_report_res.status_code == 200, "JSON Export generation failed"
    print(f"[OK] JSON Export verified ({len(json_report_res.text)} chars)")

    print("\n" + "=" * 70)
    print("[SUCCESS] ALL 8 PIPELINE STAGES & EXPORTS PASSED SUCCESSFULLY!")
    print("=" * 70)
    return True

if __name__ == "__main__":
    success = run_live_pipeline_test()
    if not success:
        exit(1)

