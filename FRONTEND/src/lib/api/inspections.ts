/**
 * LM-Verify: Inspections API Service
 * Dispatches to FastAPI backend at NEXT_PUBLIC_API_BASE_URL (http://localhost:8000)
 * Or delegates to mock provider if NEXT_PUBLIC_USE_MOCK_API is enabled
 */

import { Inspection, InspectionStats } from "@/types/inspection";
import { apiClient, getApiBaseUrl, isMockMode, ApiError } from "./client";
import {
  mockGetInspection,
  mockGetStats,
  mockListInspections,
  mockUploadInspection,
} from "./mock";

/**
 * Submit Cloudinary image URLs for multi-panel compliance inspection
 * POST /api/v1/inspections
 * application/json
 */
export async function uploadInspection(urls: string[]): Promise<Inspection> {
  if (urls.length === 0) {
    throw new Error("No image URLs provided for inspection.");
  }

  if (isMockMode()) {
    // Fallback mock using the first URL if needed
    return mockUploadInspection(new File([], "mock.jpg"));
  }

  try {
    const data = await apiClient<Inspection>("/api/v1/inspections", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: urls[0],
        image_urls: urls,
      }),
    });
    return data;
  } catch (error: any) {
    // If backend is down and user wants seamless fallback or clear error
    if (error instanceof ApiError && error.isNetworkError) {
      throw new ApiError(
        `Failed to reach backend at ${getApiBaseUrl()}. Please verify FastAPI is running (uvicorn app.main:app --port 8000) or enable mock mode in .env.`,
        0,
        { original: error.message },
        true
      );
    }
    throw error;
  }
}

/**
 * Fetch a single inspection by ID
 * GET /api/v1/inspections/{inspection_id}
 */
export async function getInspection(id: string): Promise<Inspection> {
  if (isMockMode()) {
    return mockGetInspection(id);
  }

  try {
    const data = await apiClient<Inspection>(`/api/v1/inspections/${id}`, {
      method: "GET",
    });
    return data;
  } catch (error: any) {
    if (error instanceof ApiError && error.isNetworkError) {
      throw new ApiError(
        `Cannot fetch inspection ${id}. Backend at ${getApiBaseUrl()} is unreachable.`,
        0,
        null,
        true
      );
    }
    throw error;
  }
}

/**
 * List recent inspections
 * GET /api/v1/inspections
 */
export async function listInspections(): Promise<Inspection[]> {
  if (isMockMode()) {
    return mockListInspections();
  }

  try {
    const data = await apiClient<Inspection[] | { items: Inspection[] }>("/api/v1/inspections", {
      method: "GET",
    });

    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray((data as any).items)) {
      return (data as any).items;
    }
    return [];
  } catch (error: any) {
    if (error instanceof ApiError && error.isNetworkError) {
      // Return empty list on network error to allow dashboard to render with error banner
      console.warn("Backend unavailable during listInspections:", error.message);
      return [];
    }
    throw error;
  }
}

/**
 * Fetch inspection stats (or compute locally if endpoint not present on backend)
 */
export async function getInspectionStats(): Promise<InspectionStats> {
  if (isMockMode()) {
    return mockGetStats();
  }

  try {
    // Try dedicated stats endpoint if backend has it
    const stats = await apiClient<InspectionStats>("/api/v1/inspections/stats", {
      method: "GET",
    });
    return stats;
  } catch {
    // Graceful fallback: fetch list and aggregate client-side
    try {
      const list = await listInspections();
      const total = list.length;
      const compliant = list.filter(
        (i) => i.result?.overall_status === "COMPLIANT"
      ).length;
      const non_compliant = list.filter(
        (i) => i.result?.overall_status === "NON_COMPLIANT"
      ).length;
      const needs_review = list.filter(
        (i) => i.result?.overall_status === "NEEDS_REVIEW"
      ).length;
      const processing = list.filter(
        (i) => i.status === "queued" || i.status === "processing"
      ).length;

      return {
        total,
        compliant,
        non_compliant,
        needs_review,
        processing,
      };
    } catch {
      return {
        total: 0,
        compliant: 0,
        non_compliant: 0,
        needs_review: 0,
        processing: 0,
      };
    }
  }
}

/**
 * Fetch report if backend provides it
 * GET /api/v1/inspections/{inspection_id}/report
 */
export async function getInspectionReport(id: string): Promise<any | null> {
  if (isMockMode()) {
    return null; // Signals UI to render the client-side printable report
  }

  try {
    const report = await apiClient<any>(`/api/v1/inspections/${id}/report`, {
      method: "GET",
    });
    return report;
  } catch {
    // Backend report generation endpoint not available yet - return null
    return null;
  }
}
