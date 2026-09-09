import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ComplianceStatus, FindingSeverity, FindingStatus } from "@/types/inspection";

/**
 * Merge Tailwind classes cleanly
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format ISO date string into readable Indian standard format
 */
export function formatDate(dateString?: string | null): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Format bytes to readable size (KB/MB)
 */
export function formatBytes(bytes?: number, decimals = 1): string {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format confidence decimal (0.0 - 1.0) as percentage
 */
export function formatConfidence(confidence?: number | null): string {
  if (confidence === undefined || confidence === null) return "N/A";
  const percentage = confidence <= 1 ? confidence * 100 : confidence;
  return `${Math.round(percentage)}%`;
}

/**
 * Color metadata for compliance status
 */
export function getComplianceStatusConfig(status?: string | null) {
  const norm = (status || "").toUpperCase();
  switch (norm) {
    case "COMPLIANT":
      return {
        label: "COMPLIANT",
        description: "Meets all Legal Metrology (PC) Rules, 2011 requirements",
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        border: "border-emerald-300",
        badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
        iconColor: "text-emerald-600",
      };
    case "NON_COMPLIANT":
      return {
        label: "NON-COMPLIANT",
        description: "Violations detected against Legal Metrology Rules",
        bg: "bg-rose-50",
        text: "text-rose-700",
        border: "border-rose-300",
        badgeBg: "bg-rose-100 text-rose-800 border-rose-200",
        iconColor: "text-rose-600",
      };
    case "NEEDS_REVIEW":
    default:
      return {
        label: "NEEDS REVIEW",
        description: "Requires manual inspection / ambiguous declaration detected",
        bg: "bg-amber-50",
        text: "text-amber-800",
        border: "border-amber-300",
        badgeBg: "bg-amber-100 text-amber-800 border-amber-200",
        iconColor: "text-amber-600",
      };
  }
}

/**
 * Color metadata for finding status
 */
export function getFindingStatusConfig(status?: string | null) {
  const norm = (status || "").toUpperCase();
  switch (norm) {
    case "PASS":
      return {
        label: "PASS",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
      };
    case "FAIL":
      return {
        label: "FAIL",
        badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
      };
    case "WARNING":
      return {
        label: "WARNING",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
      };
    case "MANUAL_CHECK":
    default:
      return {
        label: "REVIEW",
        badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
      };
  }
}

/**
 * Severity badge styling
 */
export function getSeverityConfig(severity?: string | null) {
  const norm = (severity || "").toUpperCase();
  switch (norm) {
    case "ERROR":
      return {
        label: "ERROR",
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
      };
    case "WARNING":
      return {
        label: "WARNING",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
      };
    case "INFO":
    default:
      return {
        label: "INFO",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
      };
  }
}
