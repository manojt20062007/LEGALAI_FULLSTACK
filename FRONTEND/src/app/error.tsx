"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global UI error boundary caught:", error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Application Error Encountered
        </h1>
        <p className="text-sm text-slate-500">
          An unexpected error occurred while processing the Legal Metrology view.
        </p>
      </div>

      <div className="flex justify-center gap-3">
        <Link href="/dashboard">
          <Button variant="outline" size="md">
            <Home className="w-4 h-4 mr-1.5" />
            Dashboard
          </Button>
        </Link>
        <Button onClick={() => reset()} size="md" className="bg-blue-700 hover:bg-blue-800 text-white">
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
