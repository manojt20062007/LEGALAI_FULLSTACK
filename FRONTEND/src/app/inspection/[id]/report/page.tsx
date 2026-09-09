"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { getInspection } from "@/lib/api/inspections";
import { Inspection } from "@/types/inspection";
import { ReportView } from "@/components/inspection/ReportView";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

interface ReportPageProps {
  params: {
    id: string;
  };
}

export default function ReportPage({ params }: ReportPageProps) {
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInspection = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInspection(params.id);
      setInspection(data);
    } catch (err: any) {
      console.error("Fetch report error:", err);
      setError(
        err.message ||
          "Failed to load inspection report data. Please ensure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspection();
  }, [params.id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-700" />
        <h2 className="text-xl font-bold text-slate-800">Generating Inspection Audit Report...</h2>
        <p className="text-sm text-slate-500">Compiling Legal Metrology statutory declarations for {params.id}</p>
      </div>
    );
  }

  if (error || !inspection) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <Alert variant="error" title="Report Unavailable">
          {error || "Report generation is currently unavailable for this inspection."}
        </Alert>
        <div className="flex justify-center gap-3">
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Dashboard
            </Button>
          </Link>
          <Button onClick={fetchInspection}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full">
      <ReportView inspection={inspection} />
    </div>
  );
}
