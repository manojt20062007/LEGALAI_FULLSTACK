"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  Image as ImageIcon,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Camera,
  Camera,
  Layers,
  AlertTriangle,
  ZoomIn,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { formatBytes } from "@/lib/utils";
import { CameraModal } from "./CameraModal";

interface ImageUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  isLoading?: boolean;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per file
const MAX_FILES = 4;

const PANEL_LABELS = [
  "Panel 1: Front / Principal Display",
  "Panel 2: MRP & Date Stamp Panel",
  "Panel 3: Manufacturer & Care Panel",
  "Panel 4: Additional Declarations",
];

export function ImageUploader({ onUpload, isLoading = false }: ImageUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  // Quality warnings: one entry per selected file (null = ok, string = warning message)
  const [qualityWarnings, setQualityWarnings] = useState<(string | null)[]>([]);
  // Resolution info: "WxH" per file
  const [resolutions, setResolutions] = useState<string[]>([]);

  /**
   * Analyse image quality using Canvas + a Laplacian blur variance score.
   * Returns { blurScore, width, height, warning } synchronously-ish via Promise.
   */
  const analyzeImageQuality = (file: File, objectUrl: string): Promise<{ warning: string | null; resolution: string }> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img;
        const resolution = `${w}\u00d7${h}`;
        const warnings: string[] = [];

        // Resolution check — anything under 640px on the short side is risky
        if (Math.min(w, h) < 480) {
          warnings.push(`Very low resolution (${w}\u00d7${h}). OCR accuracy may be reduced.`);
        } else if (Math.min(w, h) < 720) {
          warnings.push(`Low resolution (${w}\u00d7${h}). Consider a sharper photo.`);
        }

        // Blur detection via Laplacian variance on a canvas
        try {
          const canvas = document.createElement("canvas");
          const MAX_SIDE = 400;
          const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
          canvas.width = Math.round(w * scale);
          canvas.height = Math.round(h * scale);
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Convert to grayscale and compute Laplacian variance
          const gray: number[] = [];
          for (let i = 0; i < data.length; i += 4) {
            gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          }
          const cw = canvas.width;
          const ch = canvas.height;
          let sum = 0, sum2 = 0, n = 0;
          for (let y = 1; y < ch - 1; y++) {
            for (let x = 1; x < cw - 1; x++) {
              const lap =
                gray[(y - 1) * cw + x] + gray[(y + 1) * cw + x] +
                gray[y * cw + (x - 1)] + gray[y * cw + (x + 1)] -
                4 * gray[y * cw + x];
              sum += lap;
              sum2 += lap * lap;
              n++;
            }
          }
          const mean = sum / n;
          const variance = sum2 / n - mean * mean;

          // Empirically: variance < 20 → very blurry, < 60 → likely blurry
          if (variance < 20) {
            warnings.push("Image appears very blurry. Retake with better focus for accurate OCR.");
          } else if (variance < 60) {
            warnings.push("Image may be slightly out of focus. A sharper photo improves OCR.");
          }
        } catch {
          // Canvas may throw in some environments — just skip blur check
        }

        resolve({ warning: warnings.length > 0 ? warnings[0] : null, resolution });
      };
      img.onerror = () => resolve({ warning: null, resolution: "" });
      img.src = objectUrl;
    });
  };

  const validateAndAddFiles = (newFiles: File[]) => {
    setErrorMessage(null);

    const validFiles: File[] = [];
    const validUrls: string[] = [];

    for (const file of newFiles) {
      if (selectedFiles.length + validFiles.length >= MAX_FILES) {
        setErrorMessage(`Maximum of ${MAX_FILES} packaging panel photos allowed per inspection.`);
        break;
      }

      // Validate type
      const fileType = file.type.toLowerCase();
      const fileName = file.name.toLowerCase();
      const hasValidExt = ACCEPTED_EXTENSIONS.some((ext) => fileName.endsWith(ext));

      if (!ACCEPTED_TYPES.includes(fileType) && !hasValidExt) {
        setErrorMessage(`Unsupported format for "${file.name}". Allowed formats: JPG, PNG, WEBP.`);
        continue;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setErrorMessage(`File "${file.name}" exceeds 10MB limit.`);
        continue;
      }

      validFiles.push(file);
      validUrls.push(URL.createObjectURL(file));
    }

    if (validFiles.length > 0) {
      const newUrls = validFiles.map((f) => URL.createObjectURL(f));
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      setPreviewUrls((prev) => [...prev, ...newUrls]);

      // Asynchronously analyse each new image for quality
      newUrls.forEach(async (url, i) => {
        const { warning, resolution } = await analyzeImageQuality(validFiles[i], url);
        setQualityWarnings((prev) => {
          const copy = [...prev];
          copy[selectedFiles.length + i] = warning;
          return copy;
        });
        setResolutions((prev) => {
          const copy = [...prev];
          copy[selectedFiles.length + i] = resolution;
          return copy;
        });
      });
    }
  };



  const handleRemoveOne = (index: number) => {
    if (previewUrls[index]) {
      URL.revokeObjectURL(previewUrls[index]);
    }
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    setQualityWarnings((prev) => prev.filter((_, i) => i !== index));
    setResolutions((prev) => prev.filter((_, i) => i !== index));
    setErrorMessage(null);
  };

  const handleClearAll = () => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
    setQualityWarnings([]);
    setResolutions([]);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setErrorMessage("Please select or capture at least one packaging image before starting.");
      return;
    }
    await onUpload(selectedFiles);
  };

  return (
    <div className="w-full space-y-6">
      {errorMessage && (
        <Alert variant="error" title="Upload Notice">
          {errorMessage}
        </Alert>
      )}



      {selectedFiles.length === 0 ? (
        /* Empty State: Initial Camera Zone */
        <div
          onClick={() => setIsCameraOpen(true)}
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer group border-slate-300 hover:border-blue-500 bg-white hover:bg-slate-50/50`}
        >
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:bg-blue-100 transition-all">
              <Camera className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Live Capture Packaging Panels
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Snap 1 to 4 photos (e.g. Front display panel, MRP label, Manufacturer details) for fused Legal Metrology auditing. Geo-tags will be automatically embedded.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-3 pt-2 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <Button
                type="button"
                variant="primary"
                onClick={() => setIsCameraOpen(true)}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs sm:text-sm py-2 px-3 sm:px-4 shadow-sm"
              >
                <Camera className="w-4 h-4 mr-1.5" />
                Launch Secure Camera
              </Button>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-2 pt-2 text-xs text-slate-500">
              <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">Multi-Photo Fusion</span>
              <span className="text-slate-400">•</span>
              <span>Live Location Tagging Required</span>
            </div>
          </div>
        </div>
      ) : (
        /* Multi-Photo Thumbnails & Control Panel */
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                  Packaging Panels ({selectedFiles.length}/{MAX_FILES} Selected)
                </h4>
                <p className="text-xs text-slate-500">
                  Transcripts from all panels will be cross-audited and fused automatically.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedFiles.length < MAX_FILES && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCameraOpen(true)}
                    disabled={isLoading}
                    className="text-blue-700 border-blue-200 hover:bg-blue-50 text-xs"
                  >
                    <Camera className="w-3.5 h-3.5 mr-1" />
                    Snap Angle
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                disabled={isLoading}
                className="text-slate-400 hover:text-rose-600 text-xs"
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Thumbnail Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {selectedFiles.map((file, idx) => (
              <div
                key={idx}
                className="relative group rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-2xs hover:border-blue-300 transition-all flex flex-col"
              >
                {/* Panel Badge */}
                <div className="bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 flex items-center justify-between">
                  <span className="truncate">{PANEL_LABELS[idx] || `Panel ${idx + 1}`}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveOne(idx)}
                    disabled={isLoading}
                    className="text-slate-300 hover:text-rose-400 p-0.5 rounded transition-colors"
                    title="Remove this panel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Thumbnail Image */}
                <div className="h-44 sm:h-48 w-full bg-slate-100 flex items-center justify-center overflow-hidden p-2">
                  <img
                    src={previewUrls[idx]}
                    alt={`Panel ${idx + 1}`}
                    className="w-full h-full object-contain rounded"
                  />
                </div>

                {/* File Footer with resolution */}
                <div className="p-2.5 bg-white border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate max-w-[120px]" title={file.name}>
                      {file.name}
                    </span>
                    <span className="font-mono text-slate-400">{formatBytes(file.size)}</span>
                  </div>
                  {resolutions[idx] && (
                    <div className="text-[10px] text-slate-400 font-mono">{resolutions[idx]}px</div>
                  )}
                  {/* Quality warning badge */}
                  {qualityWarnings[idx] && (
                    <div className="flex items-start gap-1 bg-amber-50 border border-amber-200 rounded px-2 py-1 text-[10px] text-amber-800">
                      <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
                      <span>{qualityWarnings[idx]}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Add More Slot (if under max) */}
            {selectedFiles.length < MAX_FILES && (
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                disabled={isLoading}
                className="h-44 sm:h-auto min-h-[180px] rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/30 flex flex-col items-center justify-center p-4 text-center group transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-white shadow-2xs text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform mb-2">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-slate-700">Add Panel Photo</span>
                <span className="text-[11px] text-slate-400">e.g. MRP close-up or Back</span>
              </button>
            )}
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                <strong>{selectedFiles.length} panel{selectedFiles.length > 1 ? "s" : ""}</strong> ready for unified Legal Metrology audit
              </span>
            </div>

            <Button
              type="button"
              onClick={handleSubmit}
              isLoading={isLoading}
              className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 text-white font-bold px-6 py-2.5 shadow-md"
            >
              <span>Audit Compliance ({selectedFiles.length} Photos)</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Photography & Label Best Practices */}
      <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-4 text-xs text-slate-600 space-y-2">
        <div className="font-semibold text-blue-900 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Multi-Photo Legal Metrology Strategy</span>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 pl-4 list-disc">
          <li><strong>Photo 1: Front Panel</strong> — Captures Commodity Name, Brand, and Net Quantity.</li>
          <li><strong>Photo 2: MRP & Date Panel</strong> — Take a clear close-up of the MRP table and packed date.</li>
          <li><strong>Photo 3: Manufacturer Address</strong> — Captures company name, pincode, and consumer care email.</li>
          <li><strong>Photo 4: Barcode / Origin</strong> — Captures "Made in India" and standard unit statements.</li>
        </ul>
      </div>

      {/* Live Camera Viewfinder Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(file) => validateAndAddFiles([file])}
      />
    </div>
  );
}
