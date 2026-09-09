"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Filter,
  Scale,
  ExternalLink,
} from "lucide-react";
import { ComplianceFinding } from "@/types/inspection";
import { getFindingStatusConfig, getSeverityConfig } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";

interface FindingsTableProps {
  findings?: ComplianceFinding[];
}

export function FindingsTable({ findings = [] }: FindingsTableProps) {
  const [activeFilter, setActiveFilter] = useState<"ALL" | "FAIL" | "WARNING" | "PASS">("ALL");

  const filteredFindings = findings.filter((finding) => {
    const status = (finding.status || "").toUpperCase();
    if (activeFilter === "ALL") return true;
    if (activeFilter === "FAIL") return status === "FAIL";
    if (activeFilter === "WARNING") return status === "WARNING" || status === "MANUAL_CHECK";
    if (activeFilter === "PASS") return status === "PASS";
    return true;
  });

  const passCount = findings.filter((f) => f.status.toUpperCase() === "PASS").length;
  const failCount = findings.filter((f) => f.status.toUpperCase() === "FAIL").length;
  const warnCount = findings.filter(
    (f) => f.status.toUpperCase() === "WARNING" || f.status.toUpperCase() === "MANUAL_CHECK"
  ).length;

  return (
    <Card className="shadow-xs border-slate-200">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-blue-700" />
              Statutory Compliance Evaluation Findings
            </CardTitle>
            <p className="text-xs text-slate-500">
              Rule-by-rule audit against Legal Metrology (Packaged Commodities) Rules, 2011
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-lg text-xs self-start sm:self-auto">
            <button
              onClick={() => setActiveFilter("ALL")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({findings.length})
            </button>
            <button
              onClick={() => setActiveFilter("FAIL")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                activeFilter === "FAIL"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-rose-700 hover:bg-rose-50"
              }`}
            >
              Violations ({failCount})
            </button>
            <button
              onClick={() => setActiveFilter("WARNING")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                activeFilter === "WARNING"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-amber-800 hover:bg-amber-50"
              }`}
            >
              Warnings ({warnCount})
            </button>
            <button
              onClick={() => setActiveFilter("PASS")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                activeFilter === "PASS"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-emerald-800 hover:bg-emerald-50"
              }`}
            >
              Passed ({passCount})
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {filteredFindings.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No compliance findings match the selected filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredFindings.map((finding, idx) => {
              const status = (finding.status || "").toUpperCase();
              const severity = (finding.severity || "INFO").toUpperCase();
              const statusCfg = getFindingStatusConfig(status);
              const severityCfg = getSeverityConfig(severity);

              return (
                <div
                  key={idx}
                  className={`p-4 sm:p-5 transition-colors flex flex-col sm:flex-row items-start justify-between gap-4 ${
                    status === "FAIL"
                      ? "bg-rose-50/20 hover:bg-rose-50/40"
                      : status === "WARNING"
                      ? "bg-amber-50/20 hover:bg-amber-50/40"
                      : "hover:bg-slate-50/60"
                  }`}
                >
                  {/* Left: Status Icon and Details */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {status === "PASS" && (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                      {status === "FAIL" && (
                        <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                          <XCircle className="w-4 h-4" />
                        </div>
                      )}
                      {(status === "WARNING" || status === "MANUAL_CHECK") && (
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {finding.rule_id}
                        </span>
                        <h4 className="text-sm font-semibold text-slate-900">
                          {finding.rule_title || finding.field.replace(/_/g, " ").toUpperCase()}
                        </h4>
                        {finding.reference_rule && (
                          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                            • {finding.reference_rule}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-slate-700 leading-relaxed">
                        {finding.message}
                      </p>

                      {/* Actual vs Expected metadata if present */}
                      {(finding.actual_value !== undefined || finding.expected) && (
                        <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                          {finding.actual_value !== undefined && (
                            <div className="text-slate-600">
                              <span className="font-medium text-slate-500">Detected: </span>
                              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                                {String(finding.actual_value || "None / Missing")}
                              </span>
                            </div>
                          )}
                          {finding.expected && (
                            <div className="text-slate-600">
                              <span className="font-medium text-slate-500">Statutory Format: </span>
                              <span className="font-mono bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-800">
                                {finding.expected}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Badges */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 self-start sm:self-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${statusCfg.badgeClass}`}
                    >
                      {statusCfg.label}
                    </span>
                    {status !== "PASS" && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${severityCfg.badgeClass}`}
                      >
                        {severityCfg.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
