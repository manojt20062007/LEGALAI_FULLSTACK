"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  PlusCircle,
  ArrowLeft,
  Scale,
  Sparkles,
  Info,
  CheckCircle2,
} from "lucide-react";
import { uploadInspection } from "@/lib/api/inspections";
import { ImageUploader } from "@/components/inspection/ImageUploader";
import { Alert } from "@/components/ui/Alert";
import { isMockMode, getApiBaseUrl } from "@/lib/api/client";

export default function NewInspectionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (files: File[]) => {
    setLoading(true);
    setError(null);

    try {
      const inspection = await uploadInspection(files);
      if (inspection && inspection.id) {
        router.push(`/inspection/${inspection.id}/processing`);
      } else {
        throw new Error("Invalid response received from inspection API.");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(
        err.message ||
          "Failed to upload product label image. Please check your backend connection."
      );
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 w-full">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200">
          <Scale className="w-3.5 h-3.5 text-blue-700" />
          <span>Legal Metrology (Packaged Commodities) Rules, 2011</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          New Product Label Inspection
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl">
          Upload a high-resolution photograph of the packaged commodity. The automated engine
          will extract mandatory statutory declarations and evaluate compliance.
        </p>
      </div>

      {error && (
        <Alert variant="error" title="Upload Failed">
          {error}
        </Alert>
      )}

      {/* Uploader Component */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <ImageUploader onUpload={handleUpload} isLoading={loading} />
      </div>

      {/* Checklist Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-xs text-slate-600 space-y-3">
        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Mandatory Declarations Checked Automatically:
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="font-semibold text-slate-800 block">1. Name & Address</span>
            <span className="text-slate-500 text-[11px]">Rule 6(1)(a) Manufacturer/Packer</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="font-semibold text-slate-800 block">2. Country of Origin</span>
            <span className="text-slate-500 text-[11px]">Rule 6(10) Domestic / Imported</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="font-semibold text-slate-800 block">3. Net Quantity</span>
            <span className="text-slate-500 text-[11px]">Rule 12 Standard SI Units (g/kg/ml)</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="font-semibold text-slate-800 block">4. Maximum Retail Price</span>
            <span className="text-slate-500 text-[11px]">Rule 6(1)(e) (Incl. of all taxes)</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="font-semibold text-slate-800 block">5. Month & Year of Mfg</span>
            <span className="text-slate-500 text-[11px]">Rule 6(1)(d) Date of Packaging</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="font-semibold text-slate-800 block">6. Consumer Care Grievance</span>
            <span className="text-slate-500 text-[11px]">Rule 6(1)(h) Phone & Email details</span>
          </div>
        </div>
      </div>
    </div>
  );
}
