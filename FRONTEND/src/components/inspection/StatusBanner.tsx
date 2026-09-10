import React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Percent,
  Calendar,
  Layers,
} from "lucide-react";
import { ComplianceStatus, Inspection } from "@/types/inspection";
import { formatConfidence, formatDate, getComplianceStatusConfig } from "@/lib/utils";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";

interface StatusBannerProps {
  inspection: Inspection;
}

export function StatusBanner({ inspection }: StatusBannerProps) {
  const result = inspection.result;
  const overallStatus = (result?.overall_status || "NEEDS_REVIEW") as ComplianceStatus;
  const config = getComplianceStatusConfig(overallStatus);

  const passedCount = result?.findings?.filter((f) => f.status.toUpperCase() === "PASS").length || 0;
  const failedCount = result?.findings?.filter((f) => f.status.toUpperCase() === "FAIL").length || 0;
  const warningCount =
    result?.findings?.filter(
      (f) => f.status.toUpperCase() === "WARNING" || f.status.toUpperCase() === "MANUAL_CHECK"
    ).length || 0;

  return (
    <div
      className={`rounded-2xl border ${config.border} ${config.bg} p-6 sm:p-8 transition-all shadow-xs`}
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left: Status Icon & Title */}
        <div className="flex items-start gap-4">
          <div className="mt-1">
            {overallStatus === "COMPLIANT" && (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
            )}
            {overallStatus === "NON_COMPLIANT" && (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
                <XCircle className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
            )}
            {overallStatus === "NEEDS_REVIEW" && (
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Compliance Status
              </span>
              <Badge
                variant={
                  overallStatus === "COMPLIANT"
                    ? "compliant"
                    : overallStatus === "NON_COMPLIANT"
                    ? "nonCompliant"
                    : "needsReview"
                }
                size="md"
              >
                {config.label}
              </Badge>
            </div>

            <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${config.text}`}>
              {overallStatus === "COMPLIANT" && "Legal Metrology Rules Compliant"}
              {overallStatus === "NON_COMPLIANT" && "Non-Compliance / Violations Detected"}
              {overallStatus === "NEEDS_REVIEW" && "Manual Legal Review Required"}
            </h2>

            <p className="text-sm text-slate-600 max-w-2xl">{config.description}</p>
          </div>
        </div>

        {/* Right: Metrics & Report Button */}
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto justify-start lg:justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-200">
          {/* Rule Breakdown Mini-Badges */}
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{passedCount} Passed</span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5 text-rose-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>{failedCount} Failed</span>
            </div>
            {warningCount > 0 && (
              <>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1.5 text-amber-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>{warningCount} Warnings</span>
                </div>
              </>
            )}
          </div>

          {/* OCR Confidence */}
          {result?.confidence !== undefined && (
            <div className="flex items-center gap-1.5 bg-white/80 px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium">
              <Percent className="w-3.5 h-3.5 text-blue-600" />
              <span>Confidence:</span>
              <span className="font-bold text-slate-900">
                {formatConfidence(result.confidence)}
              </span>
            </div>
          )}


        </div>
      </div>
    </div>
  );
}
