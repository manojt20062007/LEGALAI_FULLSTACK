/**
 * LM-Verify: Centralized API Client Layer
 */

export class ApiError extends Error {
  public statusCode: number;
  public details?: any;
  public isNetworkError: boolean;

  constructor(message: string, statusCode = 500, details?: any, isNetworkError = false) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
    this.isNetworkError = isNetworkError;
  }
}

const DEFAULT_API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `http://${hostname}:8000`;
    }
  }
  return DEFAULT_API_BASE_URL;
}

export function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_API === "true";
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * Standardized fetch wrapper with timeout and error normalization
 */
export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 30000, headers = {}, ...restOptions } = options;
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const roleHeader = typeof window !== "undefined" ? (localStorage.getItem("user_role") || "inspector") : "inspector";

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers: {
        Accept: "application/json",
        "X-User-Role": roleHeader,
        ...headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Parse response body safely
    let responseData: any = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }
    } else if (contentType.includes("text/")) {
      responseData = await response.text();
    }

    if (!response.ok) {
      const errorMessage =
        (responseData && (responseData.detail || responseData.message || responseData.error)) ||
        `HTTP Error ${response.status}: ${response.statusText}`;
      throw new ApiError(errorMessage, response.status, responseData);
    }

    return responseData as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      throw new ApiError(
        "Request timed out. The backend server took too long to respond.",
        408,
        null,
        true
      );
    }

    if (error instanceof ApiError) {
      throw error;
    }

    // Network / connection refused error
    const message = error.message || "Failed to communicate with the LM-Verify backend.";
    throw new ApiError(
      `Unable to connect to backend at ${getApiBaseUrl()}. Ensure FastAPI is running on port 8000 or enable mock mode.`,
      0,
      { originalError: message },
      true
    );
  }
}

/**
 * Health check for FastAPI backend
 */
export async function checkBackendHealth(): Promise<{ online: boolean; message?: string }> {
  if (isMockMode()) {
    return { online: true, message: "Mock Mode Active" };
  }
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    return { online: res.ok, message: res.ok ? "Connected" : `Status ${res.status}` };
  } catch {
    try {
      // Fallback probe to root or docs
      const rootRes = await fetch(`${baseUrl}/docs`, {
        method: "HEAD",
        signal: AbortSignal.timeout(2000),
      });
      return { online: rootRes.ok, message: rootRes.ok ? "Connected (Docs)" : "Offline" };
    } catch {
      return { online: false, message: "Backend Offline" };
    }
  }
}
