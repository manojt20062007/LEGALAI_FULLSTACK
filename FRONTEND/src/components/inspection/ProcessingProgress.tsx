"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  FileSearch,
  Cpu,
  Scale,
  FileCheck,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { getInspection } from "@/lib/api/inspections";
import { Inspection, InspectionStatus } from "@/types/inspection";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";

interface ProcessingProgressProps {
  inspectionId: string;
}

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const STEPS: Step[] = [
  {
    id: "upload",
    title: "Upload Received",
    description: "Product image validated and ingested into inspection pipeline",
    icon: FileSearch,
  },
  {
    id: "ocr",
    title: "OCR Processing",
    description: "Scanning optical characters, fonts, and numeric declarations",
    icon: Cpu,
  },
  {
    id: "extraction",
    title: "Information Extraction",
    description: "Parsing MRP, Net Qty, Mfg Date, Country of Origin, & Addresses",
    icon: FileCheck,
  },
  {
    id: "rules",
    title: "Compliance Rule Checking",
    description: "Evaluating against Legal Metrology (Packaged Commodities) Rules, 2011",
    icon: Scale,
  },
  {
    id: "report",
    title: "Report Preparation",
    description: "Generating compliance findings, severity scores, and audit summary",
    icon: CheckCircle2,
  },
];

export function ProcessingProgress({ inspectionId }: ProcessingProgressProps) {
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(1);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  // Poll backend until inspection status is 'completed' or 'failed'
  useEffect(() => {
    let isCancelled = false;
    let pollTimer: NodeJS.Timeout;

    async function poll() {
      try {
        const data = await getInspection(inspectionId);
        if (isCancelled) return;

        setInspection(data);
        setPollCount((prev) => prev + 1);

        // Status mapping to visual progress steps
        const status = (data.status || "").toLowerCase();

        if (status === "completed") {
          setCurrentStepIndex(STEPS.length);
          // Auto-redirect to results page when complete
          setTimeout(() => {
            if (!isCancelled) {
              router.push(`/inspection/${inspectionId}`);
            }
          }, 800);
          return;
        }

        if (status === "failed") {
          setError(
            data.error_message ||
              "Automated inspection failed. OCR could not extract mandatory declarations from the image."
          );
          return;
        }

        // Advance simulation step smoothly if backend status is processing
        setCurrentStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));

        // Poll again after 1.5s
        pollTimer = setTimeout(poll, 1500);
      } catch (err: any) {
        if (isCancelled) return;
        console.error("Polling error:", err);
        setError(
          err.message ||
            "Unable to connect to backend server. Please ensure FastAPI is running."
        );
      }
    }

    poll();

    return () => {
      isCancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [inspectionId, router]);

  const handleRetry = () => {
    setError(null);
    setCurrentStepIndex(1);
    setPollCount(0);
    // Trigger fresh poll
    getInspection(inspectionId)
      .then((data) => {
        setInspection(data);
        if (data.status === "completed") {
          router.push(`/inspection/${inspectionId}`);
        }
      })
      .catch((err) => setError(err.message));
  };

  const progressPercentage = Math.round(
    (Math.min(currentStepIndex, STEPS.length) / STEPS.length) * 100
  );

  return (
    <div className="max-w-2xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200">
          <Scale className="w-3.5 h-3.5" />
          <span>Legal Metrology Audit Engine</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Analyzing Product Label
        </h1>
        <p className="text-sm text-slate-500">
          Inspection ID: <span className="font-mono font-medium text-slate-700">{inspectionId}</span>
        </p>
      </div>

      {error ? (
        <div className="space-y-6">
          <Alert variant="error" title="Inspection Incomplete">
            {error}
          </Alert>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => router.push("/inspection/new")}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Upload Another Image
            </Button>
            <Button onClick={handleRetry}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Retry Verification
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>Verification Progress</span>
              <span>{progressPercentage}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Step Sequence List */}
          <div className="space-y-4">
            {STEPS.map((step, idx) => {
              const isCompleted = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex - 1;
              const isPending = idx >= currentStepIndex;

              return (
                <div
                  key={step.id}
                  className={`flex items-start gap-4 p-3.5 rounded-xl border transition-all ${
                    isCurrent
                      ? "bg-blue-50/80 border-blue-300 ring-1 ring-blue-400/40"
                      : isCompleted
                      ? "bg-emerald-50/40 border-emerald-200"
                      : "bg-slate-50/50 border-slate-100 opacity-60"
                  }`}
                >
                  <div className="mt-0.5">
                    {isCompleted ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : isCurrent ? (
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center animate-spin">
                        <Loader2 className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-medium">
                        {idx + 1}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`text-sm font-semibold ${
                          isCurrent
                            ? "text-blue-900"
                            : isCompleted
                            ? "text-slate-800"
                            : "text-slate-500"
                        }`}
                      >
                        {step.title}
                      </h4>
                      {isCurrent && (
                        <span className="text-[11px] font-medium text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                          Processing
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                          Done
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 text-center text-xs text-slate-400">
            Scanning optical character markers under LMPC Rules, 2011 Schedule II standards...
          </div>
        </div>
      )}
    </div>
  );
}
