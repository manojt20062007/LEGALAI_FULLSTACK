/**
 * LM-Verify: Mock API Implementation
 * Used for development / offline demonstration when NEXT_PUBLIC_USE_MOCK_API=true
 * Strictly isolated from production API client
 */

import { Inspection, InspectionResult, InspectionStats } from "@/types/inspection";

// In-memory inspection store initialized with realistic Legal Metrology audit examples
let mockStore: Inspection[] = [
  {
    id: "INSP-8921",
    status: "completed",
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    filename: "britannia_good_day_pack.jpg",
    file_size: 1420000,
    image_url: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=800&q=80",
    result: {
      overall_status: "COMPLIANT",
      confidence: 0.94,
      product: {
        product_name: "Good Day Butter Cookies",
        brand: "Britannia",
        manufacturer: "Britannia Industries Ltd., 5/1A Hungerford Street, Kolkata - 700017",
        mrp: "₹30.00 (Incl. of all taxes)",
        net_quantity: "100 g",
        unit: "g",
        country_of_origin: "India",
        consumer_care: "1800-425-4449 / feedback@britindia.com",
        batch_no: "BN-4482-B",
        manufacturing_date: "01/2026",
        best_before: "6 Months from packaging",
        email: "feedback@britindia.com",
        phone: "1800-425-4449",
        address: "5/1A Hungerford Street, Kolkata - 700017",
      },
      ocr_text:
        "BRITANNIA GOOD DAY BUTTER COOKIES. NET QUANTITY: 100 g. MRP Rs. 30.00 (INCL. OF ALL TAXES). UNIT SALE PRICE: Rs. 0.30 / g. MFG DATE: 01/2026. BEST BEFORE 6 MONTHS FROM PACKAGING. BATCH NO: BN-4482-B. COUNTRY OF ORIGIN: INDIA. MFD BY: BRITANNIA INDUSTRIES LTD., 5/1A HUNGERFORD STREET, KOLKATA - 700017. CONSUMER CARE CELL: CALL 1800-425-4449 OR EMAIL feedback@britindia.com.",
      findings: [
        {
          rule_id: "LMPC-RULE-001",
          field: "mrp",
          status: "PASS",
          severity: "INFO",
          message: "MRP is clearly declared with mandatory suffix '(Inclusive of all taxes)'.",
          rule_title: "Maximum Retail Price Declaration",
          reference_rule: "Rule 6(1)(e) - Legal Metrology (PC) Rules, 2011",
          actual_value: "₹30.00 (Incl. of all taxes)",
        },
        {
          rule_id: "LMPC-RULE-002",
          field: "net_quantity",
          status: "PASS",
          severity: "INFO",
          message: "Net quantity declared with standard SI unit (g) complying with Schedule II.",
          rule_title: "Net Quantity Specification",
          reference_rule: "Rule 12 & Schedule II - Standard units of weight",
          actual_value: "100 g",
        },
        {
          rule_id: "LMPC-RULE-003",
          field: "country_of_origin",
          status: "PASS",
          severity: "INFO",
          message: "Country of origin 'India' is unambiguously printed on the principal display panel.",
          rule_title: "Country of Origin / Manufacture",
          reference_rule: "Rule 6(10) - Legal Metrology (PC) Rules, 2011",
          actual_value: "India",
        },
        {
          rule_id: "LMPC-RULE-004",
          field: "manufacturer",
          status: "PASS",
          severity: "INFO",
          message: "Complete registered address and name of manufacturer provided.",
          rule_title: "Manufacturer / Packer Details",
          reference_rule: "Rule 6(1)(a) - Name and complete address",
          actual_value: "Britannia Industries Ltd., Kolkata - 700017",
        },
        {
          rule_id: "LMPC-RULE-005",
          field: "consumer_care",
          status: "PASS",
          severity: "INFO",
          message: "Toll-free telephone number and valid email address available for consumer grievances.",
          rule_title: "Consumer Care Contact Information",
          reference_rule: "Rule 6(1)(h) - Grievance Redressal details",
          actual_value: "1800-425-4449 / feedback@britindia.com",
        },
        {
          rule_id: "LMPC-RULE-006",
          field: "manufacturing_date",
          status: "PASS",
          severity: "INFO",
          message: "Month and year of manufacture (01/2026) clearly legible.",
          rule_title: "Date of Packaging / Manufacture",
          reference_rule: "Rule 6(1)(d) - Month & Year of packing",
          actual_value: "01/2026",
        },
      ],
      summary: {
        total_rules: 6,
        passed: 6,
        failed: 0,
        warnings: 0,
        compliance_percentage: 100,
      },
    },
  },
  {
    id: "INSP-7312",
    status: "completed",
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    filename: "cleanpro_detergent_pouch.png",
    file_size: 2150000,
    image_url: "https://images.unsplash.com/photo-1585670270608-b4b39b023539?auto=format&fit=crop&w=800&q=80",
    result: {
      overall_status: "NON_COMPLIANT",
      confidence: 0.89,
      product: {
        product_name: "Ultra Power Detergent Powder",
        brand: "CleanPro",
        manufacturer: "Apex FMCG Solutions, Industrial Area, Solan",
        mrp: "₹149",
        net_quantity: "1 kg",
        unit: "kg",
        country_of_origin: null,
        consumer_care: "contact@apexclean.example",
        batch_no: "CP-2026-X",
        manufacturing_date: "Feb 2026",
        best_before: null,
        email: "contact@apexclean.example",
        phone: null,
        address: "Apex FMCG Solutions, Industrial Area, Solan (PIN missing)",
      },
      ocr_text:
        "CLEANPRO ULTRA POWER DETERGENT POWDER. NET WT 1 KG. MRP RS. 149. BATCH NO: CP-2026-X. MFG FEB 2026. MFD BY: APEX FMCG SOLUTIONS, INDUSTRIAL AREA, SOLAN. FOR QUERIES EMAIL contact@apexclean.example.",
      findings: [
        {
          rule_id: "LMPC-RULE-001",
          field: "mrp",
          status: "FAIL",
          severity: "ERROR",
          message: "MRP declaration does not include the mandatory phrase '(Inclusive of all taxes)'.",
          rule_title: "Maximum Retail Price Declaration",
          reference_rule: "Rule 6(1)(e) - Legal Metrology (PC) Rules, 2011",
          actual_value: "₹149",
          expected: "₹149.00 (Incl. of all taxes)",
        },
        {
          rule_id: "LMPC-RULE-007",
          field: "unit_sale_price",
          status: "FAIL",
          severity: "ERROR",
          message: "Unit Sale Price (e.g. ₹0.149 / g or ₹149 / kg) is completely missing from label.",
          rule_title: "Unit Sale Price Declaration",
          reference_rule: "Rule 6(11) - Mandatory for packaged goods post-2022 amendment",
          actual_value: "Missing",
          expected: "₹0.15 per g",
        },
        {
          rule_id: "LMPC-RULE-003",
          field: "country_of_origin",
          status: "FAIL",
          severity: "ERROR",
          message: "Country of Origin is missing from the package label.",
          rule_title: "Country of Origin Declaration",
          reference_rule: "Rule 6(10) - Legal Metrology (PC) Rules, 2011",
          actual_value: null,
          expected: "Country of Origin: India / Imported from ...",
        },
        {
          rule_id: "LMPC-RULE-005",
          field: "consumer_care",
          status: "WARNING",
          severity: "WARNING",
          message: "Only email is provided. Mandatory telephone number or postal address for consumer contact is missing.",
          rule_title: "Consumer Care Contact Information",
          reference_rule: "Rule 6(1)(h) - Phone number and grievance contact",
          actual_value: "contact@apexclean.example (No Phone)",
        },
        {
          rule_id: "LMPC-RULE-002",
          field: "net_quantity",
          status: "PASS",
          severity: "INFO",
          message: "Net quantity is declared as 1 kg.",
          rule_title: "Net Quantity Specification",
          reference_rule: "Rule 12 - Legal Metrology (PC) Rules, 2011",
          actual_value: "1 kg",
        },
      ],
      summary: {
        total_rules: 5,
        passed: 1,
        failed: 3,
        warnings: 1,
        compliance_percentage: 20,
      },
    },
  },
  {
    id: "INSP-6104",
    status: "completed",
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    filename: "himalayan_green_tea.jpg",
    file_size: 980000,
    image_url: "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=800&q=80",
    result: {
      overall_status: "NEEDS_REVIEW",
      confidence: 0.76,
      product: {
        product_name: "Himalayan Organic Green Tea",
        brand: "Himalaya Herbal Organics",
        manufacturer: "Organic Valley Estate, Palampur, HP - 176061",
        mrp: "₹180 (Incl. of all taxes)",
        net_quantity: "50g",
        unit: "g",
        country_of_origin: "India",
        consumer_care: "01894-230011 / care@himalayaorganics.in",
        batch_no: "HGT-99",
        manufacturing_date: "12/2025",
        best_before: "12 Months",
        email: "care@himalayaorganics.in",
        phone: "01894-230011",
        address: "Palampur, HP - 176061",
      },
      ocr_text:
        "HIMALAYAN ORGANIC GREEN TEA. NET WT 50g. MRP Rs. 180 (INCL. OF ALL TAXES). MFD 12/2025. BEST BEFORE 12 MONTHS. BATCH HGT-99. MFD BY ORGANIC VALLEY ESTATE PALAMPUR HP 176061. CARE@HIMALAYAORGANICS.IN.",
      findings: [
        {
          rule_id: "LMPC-RULE-001",
          field: "mrp",
          status: "PASS",
          severity: "INFO",
          message: "MRP is properly declared with tax inclusion statement.",
          rule_title: "Maximum Retail Price Declaration",
          reference_rule: "Rule 6(1)(e)",
          actual_value: "₹180 (Incl. of all taxes)",
        },
        {
          rule_id: "LMPC-RULE-008",
          field: "font_size_compliance",
          status: "WARNING",
          severity: "WARNING",
          message: "Net quantity font height appears borderline under Table 1 height regulations (min 2mm required for <= 50g). Visual verification advised.",
          rule_title: "Numeral Height & Area Regulation",
          reference_rule: "Rule 7 - Height of Numerals",
          actual_value: "Borderline font height",
        },
        {
          rule_id: "LMPC-RULE-007",
          field: "unit_sale_price",
          status: "WARNING",
          severity: "WARNING",
          message: "Unit sale price not clearly separated on primary display panel.",
          rule_title: "Unit Sale Price",
          reference_rule: "Rule 6(11)",
          actual_value: "Ambiguous placement",
        },
        {
          rule_id: "LMPC-RULE-003",
          field: "country_of_origin",
          status: "PASS",
          severity: "INFO",
          message: "Country of Origin is declared as India.",
          rule_title: "Country of Origin",
          reference_rule: "Rule 6(10)",
          actual_value: "India",
        },
      ],
      summary: {
        total_rules: 4,
        passed: 2,
        failed: 0,
        warnings: 2,
        compliance_percentage: 65,
      },
    },
  },
];

/**
 * Mock upload that creates a new queued inspection and simulates progression
 */
export async function mockUploadInspection(file: File): Promise<Inspection> {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const newId = `INSP-${randomSuffix}`;

  // Create preview URL if in browser
  let previewUrl: string | undefined;
  if (typeof window !== "undefined" && window.URL) {
    previewUrl = URL.createObjectURL(file);
  }

  const newInspection: Inspection = {
    id: newId,
    status: "processing",
    created_at: new Date().toISOString(),
    filename: file.name || "uploaded_product_label.jpg",
    file_size: file.size,
    image_url: previewUrl || "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=800&q=80",
    image_preview: previewUrl,
    progress: 25,
  };

  mockStore = [newInspection, ...mockStore];

  // Schedule background progression in mock store
  setTimeout(() => {
    const idx = mockStore.findIndex((item) => item.id === newId);
    if (idx !== -1) {
      mockStore[idx] = {
        ...mockStore[idx],
        progress: 60,
      };
    }
  }, 1200);

  setTimeout(() => {
    const idx = mockStore.findIndex((item) => item.id === newId);
    if (idx !== -1) {
      // Generate a realistic mock result
      mockStore[idx] = {
        ...mockStore[idx],
        status: "completed",
        progress: 100,
        result: {
          overall_status: "COMPLIANT",
          confidence: 0.92,
          product: {
            product_name: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") || "Inspected Packaged Good",
            brand: "Sample FMCG Brand",
            manufacturer: "Prime Foods & Commodities Pvt. Ltd., Plot 14, Sector 5, Manesar, Haryana - 122050",
            mrp: "₹85.00 (Incl. of all taxes)",
            net_quantity: "250 g",
            unit: "g",
            country_of_origin: "India",
            consumer_care: "1800-111-222 / support@primecommodities.in",
            batch_no: `BAT-${Math.floor(100000 + Math.random() * 900000)}`,
            manufacturing_date: "03/2026",
            best_before: "9 Months from packaging",
            email: "support@primecommodities.in",
            phone: "1800-111-222",
            address: "Plot 14, Sector 5, Manesar, Haryana - 122050",
          },
          ocr_text: `PRODUCT: ${file.name.toUpperCase()}\nNET WT: 250 g\nMRP: Rs. 85.00 (INCLUSIVE OF ALL TAXES)\nUNIT SALE PRICE: Rs. 0.34 / g\nMFD: 03/2026\nBEST BEFORE: 9 MONTHS\nBATCH: BAT-918231\nCOUNTRY OF ORIGIN: INDIA\nMANUFACTURED BY: PRIME FOODS & COMMODITIES PVT. LTD., PLOT 14, SECTOR 5, MANESAR, HARYANA - 122050\nCONSUMER CARE: 1800-111-222 | support@primecommodities.in`,
          findings: [
            {
              rule_id: "LMPC-RULE-001",
              field: "mrp",
              status: "PASS",
              severity: "INFO",
              message: "MRP properly printed with mandatory tax declaration suffix.",
              rule_title: "Maximum Retail Price Declaration",
              reference_rule: "Rule 6(1)(e) - Legal Metrology (PC) Rules, 2011",
              actual_value: "₹85.00 (Incl. of all taxes)",
            },
            {
              rule_id: "LMPC-RULE-002",
              field: "net_quantity",
              status: "PASS",
              severity: "INFO",
              message: "Net quantity is declared using valid SI symbol (g).",
              rule_title: "Net Quantity Declaration",
              reference_rule: "Rule 12 & Schedule II",
              actual_value: "250 g",
            },
            {
              rule_id: "LMPC-RULE-003",
              field: "country_of_origin",
              status: "PASS",
              severity: "INFO",
              message: "Country of Origin declared as India.",
              rule_title: "Country of Origin",
              reference_rule: "Rule 6(10)",
              actual_value: "India",
            },
            {
              rule_id: "LMPC-RULE-004",
              field: "manufacturer",
              status: "PASS",
              severity: "INFO",
              message: "Manufacturer name and complete address with postal code verified.",
              rule_title: "Manufacturer Details",
              reference_rule: "Rule 6(1)(a)",
              actual_value: "Prime Foods & Commodities Pvt. Ltd., Manesar - 122050",
            },
            {
              rule_id: "LMPC-RULE-005",
              field: "consumer_care",
              status: "PASS",
              severity: "INFO",
              message: "Valid telephone helpline and email address verified.",
              rule_title: "Consumer Grievance Redressal",
              reference_rule: "Rule 6(1)(h)",
              actual_value: "1800-111-222 / support@primecommodities.in",
            },
          ],
          summary: {
            total_rules: 5,
            passed: 5,
            failed: 0,
            warnings: 0,
            compliance_percentage: 100,
          },
        },
      };
    }
  }, 3200);

  return newInspection;
}

export async function mockGetInspection(id: string): Promise<Inspection> {
  const item = mockStore.find((i) => i.id === id);
  if (!item) {
    throw new Error(`Inspection with ID "${id}" not found.`);
  }
  return { ...item };
}

export async function mockListInspections(): Promise<Inspection[]> {
  return [...mockStore];
}

export async function mockGetStats(): Promise<InspectionStats> {
  const total = mockStore.length;
  const compliant = mockStore.filter(
    (i) => i.result?.overall_status === "COMPLIANT"
  ).length;
  const non_compliant = mockStore.filter(
    (i) => i.result?.overall_status === "NON_COMPLIANT"
  ).length;
  const needs_review = mockStore.filter(
    (i) => i.result?.overall_status === "NEEDS_REVIEW"
  ).length;
  const processing = mockStore.filter(
    (i) => i.status === "queued" || i.status === "processing"
  ).length;

  return {
    total,
    compliant,
    non_compliant,
    needs_review,
    processing,
  };
}
