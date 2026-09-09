# LM-Verify — Scan. Verify. Report.

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![FastAPI Backend](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](http://localhost:8000)

> **Automated Legal Metrology Compliance Verification System for Packaged Commodities**  
> Problem Statement: Software System to check compliance of Packaged Commodities under the Legal Metrology (Packaged Commodities) Rules, 2011 by scanning product images and labels.

---

## 🎯 Overview

**LM-Verify** is a production-quality V1/MVP frontend interface built to inspect, verify, and report statutory compliance of pre-packaged goods sold in India. By ingesting product packaging photography or label scans, it extracts mandatory statutory declarations via OCR and verifies them against the statutory standards under the **Legal Metrology (Packaged Commodities) Rules, 2011**.

---

## 🚀 Key Features

- **⚡ Instant Label OCR & Ingestion:** Drag-and-drop or upload product photos in JPG, PNG, or WEBP (up to 10 MB) with real-time format validation.
- **🔍 Multi-Stage Verification Pipeline:** Live polling and progress tracking through Upload → Optical Character Recognition → Entity Extraction → Statutory Rule Checking → Audit Report Preparation.
- **🛡️ Comprehensive LMPC Rule Checking:**
  - **Rule 6(1)(a):** Name and complete registered address of the manufacturer/packer.
  - **Rule 6(1)(e):** Maximum Retail Price (MRP) including the mandatory phrase `(Inclusive of all taxes)`.
  - **Rule 12 & Schedule II:** Net quantity declared in standard SI units (`g`, `kg`, `ml`, `l`, `m`, `cm`, `N`).
  - **Rule 6(10):** Unambiguous declaration of Country of Origin.
  - **Rule 6(1)(h):** Consumer care helpline telephone number and email address for grievance redressal.
  - **Rule 6(1)(d):** Month and year of manufacture/packing.
  - **Rule 6(1)(g):** Batch or lot number.
  - **Rule 6(11):** Unit Sale Price (USP) declaration.
- **📊 Real-Time Compliance Dashboard:** Quick metrics for Total Audits, Compliant packages, Violations detected, and items needing manual review.
- **📄 Printable Statutory Audit Reports:** High-clarity print layout (`window.print()`) optimized for A4 PDF export and downloadable JSON reports.
- **🔄 Robust Mock Mode:** Built-in simulated dataset enabling full end-to-end testing and demonstrations even when the backend server is offline.

---

## 🏗️ Architecture & Tech Stack

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                     # Root layout with Navbar & Footer
│   │   ├── page.tsx                       # Landing page (Hero, Workflow, LMPC Highlights)
│   │   ├── globals.css                    # Tailwind tokens & @media print styles
│   │   ├── dashboard/page.tsx             # Compliance statistics & audit history
│   │   ├── inspection/new/page.tsx        # Upload & photo ingestion
│   │   ├── inspection/[id]/processing/    # Multi-stage progress tracking & polling
│   │   ├── inspection/[id]/page.tsx       # Results (Status banner, findings, OCR text)
│   │   ├── inspection/[id]/report/page.tsx# Formal printable inspection report
│   │   ├── rules/page.tsx                 # Legal Metrology statutory rules reference
│   │   ├── not-found.tsx                  # 404 page
│   │   └── error.tsx                      # Global UI error boundary
│   ├── components/
│   │   ├── layout/                        # Navbar, Footer
│   │   ├── ui/                            # Badge, Button, Card, Alert
│   │   └── inspection/                    # ImageUploader, StatusBanner, FindingsTable, etc.
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts                  # Central fetcher, timeout & health check
│   │   │   ├── inspections.ts             # REST API methods
│   │   │   └── mock.ts                    # Isolated offline mock provider
│   │   └── utils.ts                       # Date, formatters, and status styling helpers
│   └── types/
│       └── inspection.ts                  # TypeScript interfaces (Inspection, Product, Finding)
├── .env.example
├── .env.local
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## ⚙️ Environment Variables

Create a `.env.local` file in the project root:

```bash
# Base URL for the FastAPI backend (Default: http://localhost:8000)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Set to 'true' for offline mock testing or 'false' for live FastAPI backend
NEXT_PUBLIC_USE_MOCK_API=false
```

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js**: v18.17.0+ (v20+ recommended)
- **npm**: v9+

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build
```bash
npm run build
npm run start
```

---

## 🔌 API Contract (FastAPI Integration)

The frontend communicates with FastAPI on `http://localhost:8000` via standard REST endpoints:

### 1. Upload Product Image
- **Endpoint:** `POST /api/v1/inspections`
- **Content-Type:** `multipart/form-data`
- **Body:** `image` (binary file)
- **Response:**
  ```json
  {
    "id": "INSP-8921",
    "status": "processing",
    "created_at": "2026-09-05T07:30:00Z"
  }
  ```

### 2. Get Inspection Results / Poll Status
- **Endpoint:** `GET /api/v1/inspections/{inspection_id}`
- **Response Concept:**
  ```json
  {
    "id": "INSP-8921",
    "status": "completed",
    "created_at": "2026-09-05T07:30:00Z",
    "image_url": "http://localhost:8000/media/sample.jpg",
    "result": {
      "overall_status": "COMPLIANT",
      "confidence": 0.94,
      "product": {
        "product_name": "Good Day Butter Cookies",
        "brand": "Britannia",
        "manufacturer": "Britannia Industries Ltd., Kolkata - 700017",
        "mrp": "₹30.00 (Incl. of all taxes)",
        "net_quantity": "100 g",
        "unit": "g",
        "country_of_origin": "India",
        "consumer_care": "1800-425-4449 / feedback@britindia.com"
      },
      "ocr_text": "BRITANNIA GOOD DAY BUTTER COOKIES...",
      "findings": [
        {
          "rule_id": "LMPC-RULE-001",
          "field": "mrp",
          "status": "PASS",
          "severity": "INFO",
          "message": "MRP declared with mandatory tax inclusion statement.",
          "reference_rule": "Rule 6(1)(e)"
        }
      ]
    }
  }
  ```

### 3. List Inspections History
- **Endpoint:** `GET /api/v1/inspections`
- **Response:** `Inspection[]`

---

## 🔒 Security & Quality Standards

- **Zero Client-Side Decisions:** Compliance determinations originate strictly from backend rule engines.
- **No Stored Secrets:** No API keys or sensitive credentials stored in client code.
- **Graceful Error Handling:** User-friendly alerts on network disconnection, timeouts, or malformed label images.
- **Accessibility & Contrast:** Clean UI complying with WCAG contrast standards.

---

## 📜 Statutory Disclaimer

> *Automated Preliminary Assessment. Results should be reviewed by an authorized/legal-metrology professional before being treated as an official determination.*
