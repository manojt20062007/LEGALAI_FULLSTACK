# LM-Verify (V1 Backend)
> **Scan. Verify. Report.**  
> *Automated compliance verification system for Packaged Commodities under Legal Metrology (Packaged Commodities) Rules, 2011.*

---

## 🎯 Overview

**LM-Verify** is an AI-assisted compliance engine designed for the **Smart India Hackathon**. It automates the inspection of packaged goods by scanning product labels, extracting mandatory statutory declarations, and validating them against the **Legal Metrology (Packaged Commodities) Rules, 2011**.

### V1 End-to-End Workflow:
```
Upload Label Image
       │
       ▼
Create Inspection Record (UUID)
       │
       ▼
Store Image (MinIO / S3 / Local Storage)
       │
       ▼
Optical Character Recognition (PaddleOCR / Mock OCR)
       │
       ▼
Information Extraction (MRP, Net Qty, Unit, Manufacturer, Origin, Consumer Care)
       │
       ▼
Rule Engine Evaluation (PASS / FAIL / WARNING / NOT_CHECKED)
       │
       ▼
Determine Overall Status (COMPLIANT / NON_COMPLIANT / NEEDS_REVIEW)
       │
       ▼
Generate Compliance Audit Report (PDF / HTML)
```

---

## 🛠️ Tech Stack

- **Framework**: FastAPI (Python 3.11+)
- **Database & ORM**: PostgreSQL / SQLite with SQLAlchemy 2.0
- **Validation**: Pydantic v2 & Pydantic-Settings
- **Async Task Queue**: Celery + Redis
- **Storage Abstraction**: MinIO / S3-compatible storage with local fallback
- **OCR Engine**: Modular OCR Service (PaddleOCR Adapter + Mock Adapter for development/testing)
- **Image Processing**: Pillow / OpenCV
- **Report Generation**: WeasyPrint / Jinja2 (HTML & PDF)
- **Testing**: Pytest & HTTPX

---

## 🚀 Quickstart Guide

### Option 1: Run with Docker Compose (Recommended for Full Stack)

1. Clone the repository and navigate to the backend root:
   ```bash
   cd BACKEND
   ```
2. Start all services (Backend, PostgreSQL, Redis, MinIO, Celery Worker):
   ```bash
   docker-compose up --build
   ```
3. The services will be accessible at:
   - **FastAPI API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
   - **MinIO Console**: [http://localhost:9001](http://localhost:9001) (`minioadmin` / `minioadminpassword`)

---

### Option 2: Run Locally for Development

1. **Create and activate a virtual environment**:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *Note: For lightweight local development without Docker, SQLite and Local storage work out-of-the-box (`DATABASE_URL=sqlite:///./lmverify.db`, `STORAGE_PROVIDER=local`, `OCR_PROVIDER=mock`).*

4. **Run the FastAPI Server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

5. *(Optional)* **Run Celery Worker** (if using Redis):
   ```bash
   celery -A app.workers.celery_app.celery_app worker --loglevel=info
   ```

---

## 🧪 Running Tests

Execute the automated test suite with pytest:

```bash
pytest -v
```

The test suite covers:
- System health checks
- Image validation (corrupted files, empty payloads, invalid extensions, size limits)
- Inspection lifecycle & UUID generation
- Regex label extraction heuristics
- Legal Metrology rule engine evaluations (`COMPLIANT`, `NON_COMPLIANT`, `NEEDS_REVIEW`)
- Asynchronous Celery task processing & error recovery
- Report generation (HTML & PDF formats)
- Synthetic non-copyrighted test image generation fixtures

---

## 📜 Source-Backed Legal Metrology Rules Registry

The compliance engine is data-driven, versioned, and configurable via [`compliance_rules/rules.json`](compliance_rules/rules.json). All rules are curated directly from the **Department of Consumer Affairs** ([https://consumeraffairs.gov.in/pages/legal-metrology-act](https://consumeraffairs.gov.in/pages/legal-metrology-act)):

| Rule ID | Statutory Declaration Check | Check Type | Severity | Statutory Reference |
| :--- | :--- | :--- | :--- | :--- |
| `LM-PC-001` | Maximum Retail Price (MRP) Declaration | `REQUIRED_FIELD` | `ERROR` | Rule 6(1)(e) |
| `LM-PC-002` | Net Quantity & Standard Unit Declaration | `REQUIRED_FIELD` | `ERROR` | Rule 6(1)(d) & Rule 11 |
| `LM-PC-003` | Manufacturer / Packer / Importer Details | `REQUIRED_FIELD` | `ERROR` | Rule 6(1)(a) |
| `LM-PC-004` | Country of Origin Declaration | `REQUIRED_FIELD` | `ERROR` | Rule 6(10) (Amended 2017) |
| `LM-PC-005` | Consumer Care / Contact Details | `REQUIRED_FIELD` | `WARNING` | Rule 6(1)(g) |
| `LM-PC-006` | Standard Metric Measurement Unit | `FIELD_VALUE` | `WARNING` | Rule 11 & Schedule II |
| `LM-PC-007` | Generic / Common Commodity Name | `REQUIRED_FIELD` | `WARNING` | Rule 6(1)(b) |

For comprehensive documentation on adding, updating, and versioning rules, refer to [compliance_rules/README.md](compliance_rules/README.md).

---

## 📑 API Contract

For detailed API documentation, request/response formats, enum definitions, and cURL examples for frontend integration, refer to [API_CONTRACT.md](API_CONTRACT.md).

---

## ⚖️ Legal Disclaimer

> **Automated Preliminary Assessment**: Results produced by LM-Verify are automated software estimations and should be reviewed by an authorized/legal-metrology professional before being treated as an official determination. This system does not claim to issue official government certificates.
