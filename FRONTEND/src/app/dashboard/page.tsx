"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Filter,
  RefreshCw,
  Search,
  FileText,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Package,
} from "lucide-react";
import { getInspectionStats, listInspections } from "@/lib/api/inspections";
import { Inspection, InspectionStats, ComplianceStatus } from "@/types/inspection";
import { formatDate, getComplianceStatusConfig } from "@/lib/utils";
import { isMockMode } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";

export default function DashboardPage() {
  const [stats, setStats] = useState<InspectionStats>({
    total: 0,
    compliant: 0,
    non_compliant: 0,
    needs_review: 0,
    processing: 0,
  });
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, listData] = await Promise.all([
        getInspectionStats(),
        listInspections(),
      ]);
      setStats(statsData);
      setInspections(listData);
    } catch (err: any) {
      console.error("Dashboard data load error:", err);
      setError(
        err.message ||
          "Unable to load inspection history from backend. Ensure FastAPI is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter inspections
  const filteredInspections = inspections.filter((item) => {
    const status = (item.result?.overall_status || (item.status === "processing" ? "PROCESSING" : "NEEDS_REVIEW")).toUpperCase();
    const matchesFilter =
      statusFilter === "ALL" ||
      (statusFilter === "COMPLIANT" && status === "COMPLIANT") ||
      (statusFilter === "NON_COMPLIANT" && status === "NON_COMPLIANT") ||
      (statusFilter === "NEEDS_REVIEW" && (status === "NEEDS_REVIEW" || status === "PROCESSING"));

    const name = item.result?.product?.product_name || item.filename || item.id;
    const matchesSearch =
      searchQuery.trim() === "" ||
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <LayoutDashboard className="w-7 h-7 text-blue-700" />
            Inspection Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Overview of Legal Metrology packaged commodity compliance audits
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            isLoading={loading}
            className="text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>

          <Link href="/inspection/new">
            <Button size="sm" className="bg-blue-700 hover:bg-blue-800 text-white text-xs">
              <PlusCircle className="w-3.5 h-3.5 mr-1" />
              New Inspection
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="warning" title="Backend Notification">
          {error}
        </Alert>
      )}

      {/* Compliance Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Inspections */}
        <Card className="p-5 shadow-xs border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Audits
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">
              {loading ? "..." : stats.total}
            </div>
            <p className="text-xs text-slate-400 mt-1">Packaged products evaluated</p>
          </div>
        </Card>

        {/* Compliant */}
        <Card className="p-5 shadow-xs border-emerald-200 bg-emerald-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Compliant
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-emerald-900">
              {loading ? "..." : stats.compliant}
            </div>
            <p className="text-xs text-emerald-700 mt-1">Meets all LMPC standards</p>
          </div>
        </Card>

        {/* Non-Compliant */}
        <Card className="p-5 shadow-xs border-rose-200 bg-rose-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-800">
              Non-Compliant
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-rose-900">
              {loading ? "..." : stats.non_compliant}
            </div>
            <p className="text-xs text-rose-700 mt-1">Statutory violations flagged</p>
          </div>
        </Card>

        {/* Needs Review */}
        <Card className="p-5 shadow-xs border-amber-200 bg-amber-50/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Needs Review
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-bold text-amber-900">
              {loading ? "..." : stats.needs_review}
            </div>
            <p className="text-xs text-amber-700 mt-1">Manual audit advised</p>
          </div>
        </Card>
      </div>

      {/* Quick Upload CTA Card */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-lg font-bold">Have a new packaged product to audit?</h3>
          <p className="text-xs sm:text-sm text-blue-100">
            Upload label photography to scan MRP, Net Quantity, Country of Origin, & Grievance info.
          </p>
        </div>
        <Link href="/inspection/new" className="shrink-0 w-full sm:w-auto">
          <Button size="md" className="w-full sm:w-auto bg-white text-blue-900 hover:bg-slate-100 font-semibold">
            <PlusCircle className="w-4 h-4 mr-1.5 text-blue-700" />
            <span>Upload Label Image</span>
          </Button>
        </Link>
      </div>

      {/* Recent Inspections Table Card */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Recent Product Inspections
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit logs and compliance determinations
              </p>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search product or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-48"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg text-xs">
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    statusFilter === "ALL"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter("COMPLIANT")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    statusFilter === "COMPLIANT"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-emerald-800 hover:bg-emerald-50"
                  }`}
                >
                  Compliant
                </button>
                <button
                  onClick={() => setStatusFilter("NON_COMPLIANT")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    statusFilter === "NON_COMPLIANT"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-rose-800 hover:bg-rose-50"
                  }`}
                >
                  Non-Compliant
                </button>
                <button
                  onClick={() => setStatusFilter("NEEDS_REVIEW")}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    statusFilter === "NEEDS_REVIEW"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-amber-800 hover:bg-amber-50"
                  }`}
                >
                  Review
                </button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              Loading inspection records...
            </div>
          ) : filteredInspections.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <Package className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm">No inspection records found.</p>
              <Link href="/inspection/new">
                <Button size="sm" variant="outline" className="text-xs">
                  <PlusCircle className="w-3.5 h-3.5 mr-1" />
                  Perform First Inspection
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 pl-5">Inspection ID</th>
                    <th className="p-3.5">Product / Image</th>
                    <th className="p-3.5">Audit Date</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Violations / Findings</th>
                    <th className="p-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInspections.map((item) => {
                    const status = item.result?.overall_status || (item.status === "processing" ? "NEEDS_REVIEW" : "NEEDS_REVIEW");
                    const statusCfg = getComplianceStatusConfig(status);
                    const failedCount = item.result?.findings?.filter((f) => f.status.toUpperCase() === "FAIL").length || 0;
                    const passCount = item.result?.findings?.filter((f) => f.status.toUpperCase() === "PASS").length || 0;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-5 font-mono font-medium text-blue-700">
                          <Link href={item.status === "processing" ? `/inspection/${item.id}/processing` : `/inspection/${item.id}`} className="hover:underline">
                            {item.id}
                          </Link>
                        </td>

                        <td className="p-3.5">
                          <div className="font-semibold text-slate-900 text-sm">
                            {item.result?.product?.product_name || item.filename || "Packaged Commodity"}
                          </div>
                          {item.result?.product?.brand && (
                            <div className="text-slate-500 text-[11px]">
                              Brand: {item.result.product.brand}
                            </div>
                          )}
                        </td>

                        <td className="p-3.5 text-slate-500">
                          {formatDate(item.created_at)}
                        </td>

                        <td className="p-3.5">
                          {item.status === "processing" ? (
                            <Badge variant="warning" size="sm">
                              Processing
                            </Badge>
                          ) : (
                            <Badge
                              variant={
                                status === "COMPLIANT"
                                  ? "compliant"
                                  : status === "NON_COMPLIANT"
                                  ? "nonCompliant"
                                  : "needsReview"
                              }
                              size="sm"
                            >
                              {statusCfg.label}
                            </Badge>
                          )}
                        </td>

                        <td className="p-3.5 text-slate-600">
                          {item.result?.findings ? (
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-emerald-700 font-medium">{passCount} Pass</span>
                              <span>•</span>
                              <span className={failedCount > 0 ? "text-rose-700 font-bold" : "text-slate-400"}>
                                {failedCount} Violations
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">In progress</span>
                          )}
                        </td>

                        <td className="p-3.5 pr-5 text-right">
                          <Link
                            href={
                              item.status === "processing"
                                ? `/inspection/${item.id}/processing`
                                : `/inspection/${item.id}`
                            }
                          >
                            <Button variant="ghost" size="sm" className="text-xs text-blue-700 hover:text-blue-800">
                              <span>View Result</span>
                              <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
