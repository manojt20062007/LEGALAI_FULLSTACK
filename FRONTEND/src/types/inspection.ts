/**
 * LM-Verify: Legal Metrology (Packaged Commodities) Rules, 2011
 * TypeScript Type Definitions
 */

export type InspectionStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type ComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW';

export type FindingStatus = 'PASS' | 'FAIL' | 'WARNING' | 'MANUAL_CHECK';

export type FindingSeverity = 'INFO' | 'WARNING' | 'ERROR';

export type UserRole = 'admin' | 'inspector' | 'public_viewer';

export interface UserProfile {
  user_id: string;
  name: string;
  role: UserRole;
  department?: string;
  capabilities: string[];
}

export interface ReadabilityAnalysis {
  readability_score: number;
  estimated_font_size_pt: number;
  min_height_compliant: boolean;
  contrast_score: number;
  rule_9_schedule_ii_status: string;
  notes: string;
}

export interface ProductInfo {
  product_name?: string | null;
  brand?: string | null;
  manufacturer?: string | null;
  mrp?: string | number | null;
  net_quantity?: string | number | null;
  unit?: string | null;
  country_of_origin?: string | null;
  consumer_care?: string | null;
  mfg_date?: string | null;
  batch_no?: string | null;
  manufacturing_date?: string | null;
  expiry_date?: string | null;
  best_before?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  [key: string]: any;
}

export interface ComplianceFinding {
  rule_id: string;
  field: string;
  status: FindingStatus | string;
  severity: FindingSeverity | string;
  message: string;
  rule_title?: string;
  reference_rule?: string; // e.g. "Rule 6(1)(e) Legal Metrology (PC) Rules, 2011"
  source?: {
    document: string;
    reference: string;
    source_url?: string;
    version?: string;
  };
  actual_value?: string | number | null;
  expected?: string | null;
}

export interface InspectionSummary {
  total_rules: number;
  passed: number;
  failed: number;
  warnings: number;
  compliance_percentage?: number;
}

export interface InspectionResult {
  overall_status: ComplianceStatus | string;
  product?: ProductInfo;
  readability?: ReadabilityAnalysis;
  ocr_text?: string;
  confidence?: number;
  findings: ComplianceFinding[];
  summary?: InspectionSummary;
}

export interface Inspection {
  id: string;
  status: InspectionStatus | string;
  created_at: string;
  updated_at?: string;
  image_url?: string;
  image_urls?: string[];
  image_preview?: string;
  image_previews?: string[];
  filename?: string;
  file_size?: number;
  result?: InspectionResult | null;
  error_message?: string | null;
  progress?: number; // 0-100 for processing stage
}

export interface InspectionStats {
  total: number;
  compliant: number;
  non_compliant: number;
  needs_review: number;
  processing?: number;
}

export interface InspectionReport {
  inspection_id: string;
  generated_at: string;
  official_disclaimer: string;
  inspection: Inspection;
  pdf_url?: string | null;
  report_available: boolean;
}
