# LM-Verify V1 API Contract

**Tagline**: *Scan. Verify. Report.*  
**Base URL**: `http://localhost:8000/api/v1`  
**API Version**: `1.0.0`  

This document serves as the formal specification for frontend and client integrations with the **LM-Verify** backend service.

---

## 1. Overview of Workflow

```
[ Frontend / Client ]
       │
       ▼ 1. POST /api/v1/inspections (Uploads image/multipart)
[ Returns Inspection ID: "queued" ]
       │
       ▼ 2. Poll GET /api/v1/inspections/{id} (Every 1-2 seconds)
[ Status: "queued" -> "processing" -> "completed" / "failed" ]
       │
       ▼ 3. GET /api/v1/inspections/{id}/report (Download PDF / HTML)
[ Returns Rendered Compliance Audit Report ]
```

---

## 2. Global Enums & Constants

### Inspection Status (`status`)
| Value | Description |
| :--- | :--- |
| `queued` | The inspection has been created and waiting in the worker queue. |
| `processing` | OCR, field extraction, and compliance rules are actively running. |
| `completed` | Inspection finished successfully. Full compliance results available. |
| `failed` | Processing encountered an unrecoverable error (e.g. unreadable image). |

### Overall Compliance Status (`overall_status`)
| Value | Description |
| :--- | :--- |
| `COMPLIANT` | All mandatory Legal Metrology (Packaged Commodities) Rules, 2011 checks passed. |
| `NON_COMPLIANT` | One or more mandatory checks failed (e.g., missing MRP, missing Origin, missing Net Qty). |
| `NEEDS_REVIEW` | High uncertainty, blurry image, low confidence, or missing non-critical details requiring manual inspector review. |

### Rule Status (`findings[].status`)
| Value | Description |
| :--- | :--- |
| `PASS` | Requirement detected and compliant. |
| `FAIL` | Mandatory requirement missing or violated. |
| `WARNING` | Recommended or non-critical requirement missing or ambiguous. |
| `NOT_CHECKED` | Check was skipped due to missing prerequisite data. |

### Rule Severity (`findings[].severity`)
| Value | Description |
| :--- | :--- |
| `INFO` | Informational check / non-blocking. |
| `WARNING` | Moderate warning / advisory. |
| `ERROR` | Critical legal metrology requirement. Triggers `NON_COMPLIANT` if failed. |

---

## 3. Endpoints Specification

### 3.1 Health Check

- **URL**: `/health`
- **Method**: `GET`
- **Description**: Returns system health status and API version.

#### Response `200 OK`
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-09-05T07:30:00Z"
}
```

---

### 3.2 Create Inspection (Upload Image)

- **URL**: `/api/v1/inspections`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`

#### Request Parameters
| Name | Type | In | Required | Description |
| :--- | :--- | :--- | :--- | :--- |
| `image` | `File (Binary)` | `formData` | Yes | Supported formats: `.jpg`, `.jpeg`, `.png`, `.webp`. Max size: 10MB. |

#### cURL Example
```bash
curl -X POST "http://localhost:8000/api/v1/inspections" \
  -H "Accept: application/json" \
  -F "image=@sample_label.jpg;type=image/jpeg"
```

#### Response `202 Accepted`
```json
{
  "id": "e818816c-d28f-4ad1-b20f-07444c156641",
  "status": "queued",
  "created_at": "2026-09-05T07:30:15.123456Z"
}
```

#### Error Responses
- **400 Bad Request**: Unsupported file format or corrupted image file.
  ```json
  {
    "detail": "Unsupported file extension '.txt'. Allowed extensions: .jpg, .jpeg, .png, .webp"
  }
  ```
- **413 Payload Too Large**: File size exceeds 10MB.
  ```json
  {
    "detail": "File size exceeds maximum allowed limit of 10MB."
  }
  ```

---

### 3.3 Get Inspection Status & Compliance Result

- **URL**: `/api/v1/inspections/{inspection_id}`
- **Method**: `GET`

#### Path Parameters
| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `inspection_id` | `UUID string` | Yes | The unique inspection ID returned on creation. |

#### cURL Example
```bash
curl -X GET "http://localhost:8000/api/v1/inspections/e818816c-d28f-4ad1-b20f-07444c156641" \
  -H "Accept: application/json"
```

#### Response `200 OK` (Completed Inspection)
```json
{
  "id": "e818816c-d28f-4ad1-b20f-07444c156641",
  "status": "completed",
  "created_at": "2026-09-05T07:30:15.123456Z",
  "updated_at": "2026-09-05T07:30:16.892110Z",
  "image_url": "/api/v1/storage/files/e818816c-d28f-4ad1-b20f-07444c156641.jpg",
  "result": {
    "overall_status": "COMPLIANT",
    "confidence": 0.94,
    "product": {
      "product_name": "Himalayan Natural Spring Water",
      "brand": "AquaPure",
      "manufacturer": "AquaPure Beverages India Pvt. Ltd., Haridwar, Uttarakhand - 249403",
      "mrp": "₹45.00",
      "net_quantity": "1000",
      "unit": "ml",
      "country_of_origin": "India",
      "consumer_care": "Toll Free: 1800-200-9999 | Email: customercare@aquapure.in"
    },
    "ocr_text": "PRODUCT: Himalayan Natural Spring Water\nBRAND: AquaPure\nMANUFACTURED BY: AquaPure Beverages India Pvt. Ltd...\nNET QUANTITY: 1000 ml (1 L)\nMRP: Rs. 45.00 (INCL. OF ALL TAXES)\nCOUNTRY OF ORIGIN: India\nCONSUMER CARE: Toll Free: 1800-200-9999",
    "findings": [
      {
        "rule_id": "LM-PC-001",
        "field": "mrp",
        "status": "PASS",
        "severity": "ERROR",
        "message": "Maximum Retail Price (MRP) Declaration is clearly declared: ₹45.00",
        "source": {
          "document": "Legal Metrology (Packaged Commodities) Rules, 2011",
          "reference": "Rule 6(1)(e)",
          "source_url": "https://consumeraffairs.gov.in/pages/legal-metrology-act",
          "version": "Consolidated Rules 2011",
          "effective_from": "2011-04-01"
        }
      },
      {
        "rule_id": "LM-PC-002",
        "field": "net_quantity",
        "status": "PASS",
        "severity": "ERROR",
        "message": "Net quantity is declared: 1000 ml",
        "source": {
          "document": "Legal Metrology (Packaged Commodities) Rules, 2011",
          "reference": "Rule 6(1)(d) & Rule 11",
          "source_url": "https://consumeraffairs.gov.in/pages/legal-metrology-act",
          "version": "Consolidated Rules 2011",
          "effective_from": "2011-04-01"
        }
      },
      {
        "rule_id": "LM-PC-003",
        "field": "manufacturer",
        "status": "PASS",
        "severity": "ERROR",
        "message": "Manufacturer / Packer / Importer Details is clearly declared: AquaPure Beverages India Pvt. Ltd., Haridwar, Uttarakhand - 249403",
        "source": {
          "document": "Legal Metrology (Packaged Commodities) Rules, 2011",
          "reference": "Rule 6(1)(a)",
          "source_url": "https://consumeraffairs.gov.in/pages/legal-metrology-act",
          "version": "Consolidated Rules 2011",
          "effective_from": "2011-04-01"
        }
      },
      {
        "rule_id": "LM-PC-004",
        "field": "country_of_origin",
        "status": "PASS",
        "severity": "ERROR",
        "message": "Country of Origin Declaration is clearly declared: India",
        "source": {
          "document": "Legal Metrology (Packaged Commodities) Rules, 2011",
          "reference": "Rule 6(10) (inserted via Amendment Rules, 2017)",
          "source_url": "https://consumeraffairs.gov.in/pages/legal-metrology-act",
          "version": "Amendment Rules 2017",
          "effective_from": "2018-01-01"
        }
      },
      {
        "rule_id": "LM-PC-005",
        "field": "consumer_care",
        "status": "PASS",
        "severity": "WARNING",
        "message": "Consumer Care / Contact Information is clearly declared: Toll Free: 1800-200-9999 | Email: customercare@aquapure.in",
        "source": {
          "document": "Legal Metrology (Packaged Commodities) Rules, 2011",
          "reference": "Rule 6(1)(g)",
          "source_url": "https://consumeraffairs.gov.in/pages/legal-metrology-act",
          "version": "Consolidated Rules 2011",
          "effective_from": "2011-04-01"
        }
      },
      {
        "rule_id": "LM-PC-006",
        "field": "unit",
        "status": "PASS",
        "severity": "WARNING",
        "message": "Standard prescribed value used for 'unit': 'ml'",
        "source": {
          "document": "Legal Metrology (Packaged Commodities) Rules, 2011",
          "reference": "Rule 11 & Schedule II",
          "source_url": "https://consumeraffairs.gov.in/pages/legal-metrology-act",
          "version": "Consolidated Rules 2011",
          "effective_from": "2011-04-01"
        }
      },
      {
        "rule_id": "LM-PC-007",
        "field": "product_name",
        "status": "PASS",
        "severity": "WARNING",
        "message": "Generic or Common Commodity Name is clearly declared: Himalayan Natural Spring Water",
        "source": {
          "document": "Legal Metrology (Packaged Commodities) Rules, 2011",
          "reference": "Rule 6(1)(b)",
          "source_url": "https://consumeraffairs.gov.in/pages/legal-metrology-act",
          "version": "Consolidated Rules 2011",
          "effective_from": "2011-04-01"
        }
      }
    ]
  },
  "error_message": null
}
```

#### Response `200 OK` (Processing In-Progress)
```json
{
  "id": "e818816c-d28f-4ad1-b20f-07444c156641",
  "status": "processing",
  "created_at": "2026-09-05T07:30:15.123456Z",
  "updated_at": "2026-09-05T07:30:15.551200Z",
  "image_url": "/api/v1/storage/files/e818816c-d28f-4ad1-b20f-07444c156641.jpg",
  "result": null,
  "error_message": null
}
```

#### Response `200 OK` (Processing Failed)
```json
{
  "id": "e818816c-d28f-4ad1-b20f-07444c156641",
  "status": "failed",
  "created_at": "2026-09-05T07:30:15.123456Z",
  "updated_at": "2026-09-05T07:30:16.012000Z",
  "image_url": "/api/v1/storage/files/e818816c-d28f-4ad1-b20f-07444c156641.jpg",
  "result": null,
  "error_message": "Optical Character Recognition (OCR) processing failed."
}
```

#### Error Responses
- **404 Not Found**:
  ```json
  {
    "detail": "Inspection with ID 'e818816c-d28f-4ad1-b20f-07444c156641' was not found."
  }
  ```

---

### 3.4 Download Inspection Report

- **URL**: `/api/v1/inspections/{inspection_id}/report`
- **Method**: `GET`

#### Query Parameters
| Name | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `format` | `string` | `pdf` | Format of report: `pdf` (application/pdf) or `html` (text/html). |

#### cURL Examples
```bash
# Download PDF Report
curl -X GET "http://localhost:8000/api/v1/inspections/e818816c-d28f-4ad1-b20f-07444c156641/report?format=pdf" \
  -o "inspection_report.pdf"

# View HTML Report
curl -X GET "http://localhost:8000/api/v1/inspections/e818816c-d28f-4ad1-b20f-07444c156641/report?format=html"
```

#### Response Headers
- `Content-Type`: `application/pdf` or `text/html`
- `Content-Disposition`: `attachment; filename="LM-Verify-Report-<id>.pdf"` (or `inline` for HTML)

#### Error Responses
- **409 Conflict**: Inspection still in progress.
  ```json
  {
    "detail": "Inspection is still in progress. Please wait for processing to complete before requesting report."
  }
  ```
- **422 Unprocessable Entity**: Inspection failed.
  ```json
  {
    "detail": "Cannot generate report for failed inspection: Optical Character Recognition (OCR) processing failed."
  }
  ```
- **404 Not Found**: Inspection ID not found.

---

## 4. Standard Error Format

All error responses from the backend follow the standard FastAPI error format:

```json
{
  "detail": "A clear, human-readable description of the error."
}
```

Internal server errors (HTTP 500) will never return stack traces to the client:
```json
{
  "detail": "An internal server error occurred. Please try again later.",
  "path": "/api/v1/inspections"
}
```
