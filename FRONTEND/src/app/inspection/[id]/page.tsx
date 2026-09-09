"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  RefreshCw,
  PlusCircle,
  Image as ImageIcon,
  AlertCircle,
  Clock,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  ZoomIn,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { getInspection } from "@/lib/api/inspections";
import { getApiBaseUrl } from "@/lib/api/client";
import { Inspection } from "@/types/inspection";
import { formatDate } from "@/lib/utils";
import { StatusBanner } from "@/components/inspection/StatusBanner";
import { ProductInfoCard } from "@/components/inspection/ProductInfoCard";
import { FindingsTable } from "@/components/inspection/FindingsTable";
import { ExtractedTextCard } from "@/components/inspection/ExtractedTextCard";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

interface ResultsPageProps {
  params: {
    id: string;
  };
}

export default function ResultsPage({ params }: ResultsPageProps) {
  const router = useRouter();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingXlsx, setDownloadingXlsx] = useState(false);
  // Must be declared here (not after early returns) to satisfy Rules of Hooks
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const downloadReport = async (format: "pdf" | "xlsx", setLoadingFn: (v: boolean) => void) => {
    if (!inspection) return;
    setLoadingFn(true);
    try {
      const baseUrl = getApiBaseUrl();
      const resp = await fetch(`${baseUrl}/api/v1/inspections/${inspection.id}/report?format=${format}`);
      if (!resp.ok) throw new Error(`Server error ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `LM-Verify-Report-${inspection.id}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Report download failed:", e);
    } finally {
      setLoadingFn(false);
    }
  };

  const fetchInspectionData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInspection(params.id);
      setInspection(data);

      // If inspection is still processing, redirect to processing page
      if (data.status === "processing" || data.status === "queued") {
        router.push(`/inspection/${params.id}/processing`);
        return;
      }
    } catch (err: any) {
      console.error("Fetch inspection error:", err);
      setError(
        err.message ||
          "Failed to load inspection results. Ensure the inspection ID is valid and backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspectionData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-700" />
        <h2 className="text-xl font-bold text-slate-800">Loading Inspection Results...</h2>
        <p className="text-sm text-slate-500">Retrieving optical character and compliance data for {params.id}</p>
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <Alert variant="error" title="Unable to Load Inspection">
          {error || "Inspection record not found."}
        </Alert>
        <div className="flex justify-center gap-3">
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Dashboard
            </Button>
          </Link>
          <Button onClick={fetchInspectionData}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Compute all available image URLs
  const rawUrls = (inspection.image_urls && inspection.image_urls.length > 0)
    ? inspection.image_urls
    : (inspection.image_url ? [inspection.image_url] : (inspection.image_preview ? [inspection.image_preview] : []));

  const imageUrls = rawUrls.map((raw) =>
    raw.startsWith("http") || raw.startsWith("data:")
      ? raw
      : `${getApiBaseUrl()}${raw.startsWith("/") ? "" : "/"}${raw}`
  );

  const activeImageUrl = imageUrls[activeImageIdx] || imageUrls[0] || null;

  const result = inspection.result;
  const overallStatus = inspection.status;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 w-full">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Inspection Result
              </h1>
              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700">
                {inspection.id}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Audited on {formatDate(inspection.created_at)}
              {imageUrls.length > 1 && ` • ${imageUrls.length} Packaging Panels Fused`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick download buttons — available without going to /report */}
          {inspection.result && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadReport("xlsx", setDownloadingXlsx)}
                disabled={downloadingXlsx}
                className="text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                title="Download Excel report"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                {downloadingXlsx ? "Preparing…" : ".xlsx"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadReport("pdf", setDownloadingPdf)}
                disabled={downloadingPdf}
                className="text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                title="Download PDF report"
              >
                <Download className="w-3.5 h-3.5 mr-1 text-blue-600" />
                {downloadingPdf ? "Generating…" : "PDF"}
              </Button>
            </>
          )}

          <Link href={`/inspection/${inspection.id}/report`}>
            <Button variant="primary" size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Full Report
            </Button>
          </Link>

          <Link href="/inspection/new">
            <Button variant="outline" size="sm" className="text-xs">
              <PlusCircle className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              New Inspection
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Banner */}
      <StatusBanner inspection={inspection} />

      {/* Main Grid: Left (Findings & Tables) | Right (Product Info, Image Gallery) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Statutory Findings & Extracted Text (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Statutory Findings Rule-by-Rule Table */}
          <FindingsTable
            findings={result?.findings || []}
          />

          {/* Raw Extracted OCR Text Card */}
          <ExtractedTextCard
            text={result?.ocr_text || (inspection as any).ocr_text || ""}
          />
        </div>

        {/* Right Column: Product Info Card & Image Gallery (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Extracted Product Identity Summary Card */}
          <ProductInfoCard product={result?.product} />

          {/* Package Photo Preview / Multi-Photo Gallery Card */}
          <Card className="shadow-xs border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-blue-700" />
                  <span>Packaging Panels ({imageUrls.length})</span>
                </CardTitle>
                <span className="text-[11px] text-slate-400">
                  {imageUrls.length > 1 ? `Panel ${activeImageIdx + 1} of ${imageUrls.length}` : (inspection.filename || "label.jpg")}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {activeImageUrl ? (
                <>
                  <div
                    onClick={() => setImageModalOpen(true)}
                    className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer group flex items-center justify-center max-h-[360px]"
                  >
                    <img
                      src={activeImageUrl}
                      alt={`Inspected product label panel ${activeImageIdx + 1}`}
                      className="w-full h-full object-contain max-h-[340px] group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                        <ZoomIn className="w-3.5 h-3.5" />
                        Click to Enlarge
                      </span>
                    </div>
                  </div>

                  {/* Multi-Panel Thumbnails */}
                  {imageUrls.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pt-1 pb-1">
                      {imageUrls.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImageIdx(idx)}
                          className={`relative h-14 w-14 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                            activeImageIdx === idx
                              ? "border-blue-600 ring-2 ring-blue-100"
                              : "border-slate-200 opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img src={url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[9px] text-white text-center font-bold">
                            P{idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No preview image available.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Legal Metrology Rules Checklist Card */}
          <Card className="shadow-xs border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                Statutory Standards Applied
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-600">
              <p className="leading-relaxed">
                Rules verified pursuant to Legal Metrology (Packaged Commodities) Rules, 2011,
                notified under the Legal Metrology Act, 2009.
              </p>
              <div className="pt-2 border-t border-slate-200/80">
                <Link
                  href="/rules"
                  className="text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 text-xs"
                >
                  <span>Explore All Rule Definitions</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Modal Lightbox */}
      {imageModalOpen && activeImageUrl && (
        <div
          onClick={() => setImageModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden p-2 shadow-2xl">
            <img
              src={activeImageUrl}
              alt="High resolution product label"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setImageModalOpen(false)}
              className="absolute top-4 right-4 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
