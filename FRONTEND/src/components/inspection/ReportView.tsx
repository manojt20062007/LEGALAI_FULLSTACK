"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Printer,
  Download,
  ArrowLeft,
  ShieldCheck,
  Scale,
  Calendar,
  Building2,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileDown,
  FileSpreadsheet,
} from "lucide-react";
import { getApiBaseUrl } from "@/lib/api/client";
import { Inspection, ComplianceStatus } from "@/types/inspection";
import { formatDate, formatConfidence, getComplianceStatusConfig } from "@/lib/utils";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

interface ReportViewProps {
  inspection: Inspection;
}

export function ReportView({ inspection }: ReportViewProps) {
  const [downloadingJson, setDownloadingJson] = useState(false);
  const [downloadingXlsx, setDownloadingXlsx] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const result = inspection.result;
  const product = result?.product;
  const overallStatus = (result?.overall_status || "NEEDS_REVIEW") as ComplianceStatus;
  const statusCfg = getComplianceStatusConfig(overallStatus);

  /** Generic backend report downloader (blob fetch → anchor click) */
  const downloadBackendReport = async (
    format: "pdf" | "xlsx" | "csv" | "json",
    setLoading: (v: boolean) => void
  ) => {
    setLoading(true);
    try {
      const url = `${getApiBaseUrl()}/api/v1/inspections/${inspection.id}/report?format=${format}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ext = format === "xlsx" ? "xlsx" : format === "pdf" ? "pdf" : format === "csv" ? "csv" : "json";
      a.href = objectUrl;
      a.download = `LM-Verify-Report-${inspection.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error(`Report download (${format}) failed:`, err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    setDownloadingJson(true);
    try {
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(inspection, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `LM_Verify_${inspection.id}_Report.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } finally {
      setDownloadingJson(false);
    }
  };

  const handleDownloadCsv = () => {
    const findings = result?.findings || [];
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Inspection ID," + inspection.id + "\n";
    csvContent += "Timestamp," + inspection.created_at + "\n";
    csvContent += "Overall Status," + overallStatus + "\n\n";
    csvContent += "Rule ID,Field,Status,Severity,Statutory Reference,Message\n";
    findings.forEach((f) => {
      const ref = f.source?.reference || f.reference_rule || "N/A";
      const row = `"${f.rule_id}","${f.field}","${f.status}","${f.severity}","${ref}","${f.message.replace(/"/g, '""')}"`;
      csvContent += row + "\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LM_Verify_${inspection.id}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar (Hidden during Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <Link
          href={`/inspection/${inspection.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inspection</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {/* Excel download — hits the backend xlsx endpoint */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadBackendReport("xlsx", setDownloadingXlsx)}
            disabled={downloadingXlsx}
            className="text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            title="Download Excel workbook with Summary, Product Info, and Findings sheets"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            {downloadingXlsx ? "Preparing…" : "Excel (.xlsx)"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            className="text-xs"
          >
            <FileDown className="w-3.5 h-3.5 mr-1 text-slate-500" />
            CSV Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadJson}
            disabled={downloadingJson}
            className="text-xs"
          >
            <FileDown className="w-3.5 h-3.5 mr-1 text-slate-500" />
            JSON
          </Button>



          <Button
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="bg-blue-700 hover:bg-blue-800 text-white text-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1" />
            Print
          </Button>
        </div>
      </div>

      {/* Main Printable Document Card */}
      <div className="print-container bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 shadow-sm space-y-8 text-slate-900">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-800 text-white flex items-center justify-center">
              <Scale className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  LM-Verify
                </h1>
                <span className="text-xs uppercase font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                  Audit Report
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Legal Metrology (Packaged Commodities) Rules, 2011 Verification
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right text-xs space-y-1 text-slate-600">
            <div>
              <span className="font-semibold text-slate-700">Inspection ID: </span>
              <span className="font-mono font-bold text-slate-900">{inspection.id}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Audit Timestamp: </span>
              <span>{formatDate(inspection.created_at)}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Verification Engine: </span>
              <span>LM-Verify V1 Rule Evaluator</span>
            </div>
          </div>
        </div>

        {/* Evidence Photo */}
        {(inspection.image_url || (inspection.image_urls && inspection.image_urls.length > 0)) && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1.5 flex items-center gap-2">
              <span>Evidentiary Photograph</span>
            </h3>
            <div className="flex justify-center border border-slate-200 rounded-lg p-2 bg-slate-50">
              <img 
                src={inspection.image_urls?.[0] || inspection.image_url} 
                alt="Product Label Evidence" 
                className="max-h-64 object-contain rounded"
                crossOrigin="anonymous"
              />
            </div>
          </div>
        )}

        {/* Executive Summary & Overall Compliance Banner */}
        <div className={`p-6 rounded-xl border ${statusCfg.border} ${statusCfg.bg} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Statutory Evaluation Result
            </div>
            <div className="flex items-center gap-2.5">
              {overallStatus === "COMPLIANT" && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              {overallStatus === "NON_COMPLIANT" && <XCircle className="w-6 h-6 text-rose-600" />}
              {overallStatus === "NEEDS_REVIEW" && <AlertTriangle className="w-6 h-6 text-amber-600" />}
              <h2 className={`text-xl font-bold ${statusCfg.text}`}>
                {statusCfg.label}
              </h2>
            </div>
            <p className="text-xs text-slate-600">{statusCfg.description}</p>
          </div>

          <div className="text-right text-xs bg-white px-4 py-3 rounded-lg border border-slate-200">
            <div className="text-slate-500">OCR Confidence</div>
            <div className="text-lg font-bold text-slate-900">
              {formatConfidence(result?.confidence)}
            </div>
          </div>
        </div>

        {/* Section 1: Product Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1.5 flex items-center gap-2">
            <span>1. Product Declaration Audit</span>
          </h3>

          <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-2.5 w-1/3">Statutory Declaration</th>
                <th className="p-2.5 w-1/4">Rule Reference</th>
                <th className="p-2.5">Extracted Value on Label</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-2.5 font-medium text-slate-700">Product Name / Commodity</td>
                <td className="p-2.5 font-mono text-slate-500">Rule 6(1)(a)</td>
                <td className="p-2.5 font-semibold text-slate-900">{product?.product_name || "Not Specified"}</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-2.5 font-medium text-slate-700">Brand</td>
                <td className="p-2.5 font-mono text-slate-500">Commercial</td>
                <td className="p-2.5 text-slate-900">{product?.brand || "Not Specified"}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium text-slate-700">Maximum Retail Price (MRP)</td>
                <td className="p-2.5 font-mono text-slate-500">Rule 6(1)(e)</td>
                <td className="p-2.5 font-semibold text-slate-900">{product?.mrp || "Not Declared / Missing"}</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-2.5 font-medium text-slate-700">Net Quantity / Standard Units</td>
                <td className="p-2.5 font-mono text-slate-500">Rule 12, Sched II</td>
                <td className="p-2.5 font-semibold text-slate-900">
                  {product?.net_quantity ? `${product.net_quantity} ${product.unit || ""}` : "Not Declared"}
                </td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium text-slate-700">Country of Origin</td>
                <td className="p-2.5 font-mono text-slate-500">Rule 6(10)</td>
                <td className="p-2.5 text-slate-900">{product?.country_of_origin || "Not Specified"}</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-2.5 font-medium text-slate-700">Manufacturer / Packer</td>
                <td className="p-2.5 font-mono text-slate-500">Rule 6(1)(a)</td>
                <td className="p-2.5 text-slate-900">{product?.manufacturer || product?.address || "Not Specified"}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium text-slate-700">Consumer Care / Grievance Redressal</td>
                <td className="p-2.5 font-mono text-slate-500">Rule 6(1)(h)</td>
                <td className="p-2.5 text-slate-900">{product?.consumer_care || "Not Specified"}</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-2.5 font-medium text-slate-700">Month & Year of Packaging / Mfg / Import</td>
                <td className="p-2.5 font-mono text-slate-500">Rule 6(1)(c)</td>
                <td className="p-2.5 text-slate-900">{product?.mfg_date || product?.manufacturing_date || "Not Specified"}</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium text-slate-700">Batch / Lot Number</td>
                <td className="p-2.5 font-mono text-slate-500">Rule 6(1)(g)</td>
                <td className="p-2.5 text-slate-900">{product?.batch_no || "Not Specified"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: Font Size & Readability Analysis (Rule 9 & Schedule II) */}
        {result?.readability && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1.5 flex items-center gap-2">
              <span>2. Font Size & Readability Assessment (Rule 9 & Schedule II)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-xs text-slate-500 font-medium">Readability Index</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{result.readability.readability_score}%</div>
                <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">High Clarity</div>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-xs text-slate-500 font-medium">Est. Numeral Height</div>
                <div className="text-xl font-bold text-slate-900 mt-1">~{result.readability.estimated_font_size_pt} pt</div>
                <div className="text-[11px] text-blue-700 font-semibold mt-0.5">{result.readability.rule_9_schedule_ii_status}</div>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="text-xs text-slate-500 font-medium">Contrast & Legibility</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{result.readability.contrast_score}%</div>
                <div className="text-[11px] text-slate-600 font-medium mt-0.5">Rule 9 Standard</div>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Rule-by-Rule Compliance Findings */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1.5 flex items-center gap-2">
            <span>{result?.readability ? "3" : "2"}. Legal Metrology Rules Compliance Findings</span>
          </h3>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-2.5 w-24">Rule ID</th>
                  <th className="p-2.5 w-32">Rule Scope</th>
                  <th className="p-2.5 w-24 text-center">Status</th>
                  <th className="p-2.5">Evaluation & Finding Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(result?.findings || []).map((finding, idx) => {
                  const status = (finding.status || "").toUpperCase();
                  return (
                    <tr
                      key={idx}
                      className={
                        status === "FAIL"
                          ? "bg-rose-50/50"
                          : status === "WARNING"
                          ? "bg-amber-50/50"
                          : "hover:bg-slate-50"
                      }
                    >
                      <td className="p-2.5 font-mono font-medium text-blue-800">
                        {finding.rule_id}
                      </td>
                      <td className="p-2.5 font-medium text-slate-700">
                        {finding.rule_title || finding.field}
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            status === "PASS"
                              ? "bg-emerald-100 text-emerald-800"
                              : status === "FAIL"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-800">
                        <div>{finding.message}</div>
                        {finding.reference_rule && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Ref: {finding.reference_rule}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Extracted Text Snippet */}
        {result?.ocr_text && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1.5">
              3. Raw OCR Extraction Transcript
            </h3>
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg font-mono text-[11px] text-slate-700 leading-relaxed max-h-36 overflow-y-auto">
              {result.ocr_text}
            </div>
          </div>
        )}

        {/* Statutory Disclaimer */}
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-xs text-amber-900 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <span>STATUTORY DISCLAIMER</span>
          </div>
          <p className="leading-relaxed">
            Automated Preliminary Assessment. Results should be reviewed by an authorized/legal-metrology
            professional before being treated as an official determination. This report is generated
            computationally by LM-Verify market surveillance software.
          </p>
        </div>

        {/* Signatures / Metadata */}
        <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
          <div>
            <div>System: LM-Verify Automated Inspection Pipeline v1.0</div>
            <div>Smart India Hackathon 2024 Packaged Commodities Verification</div>
          </div>
          <div className="text-right">
            <div className="font-mono">Verification Token: {inspection.id.toLowerCase()}-sec-v1</div>
            <div>Page 1 of 1</div>
          </div>
        </div>
      </div>
    </div>
  );
}
