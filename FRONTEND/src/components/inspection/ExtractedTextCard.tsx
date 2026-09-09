"use client";

import React, { useState } from "react";
import { FileCode, Copy, Check, Eye } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";

interface ExtractedTextCardProps {
  text?: string;
  confidence?: number;
}

export function ExtractedTextCard({ text = "", confidence }: ExtractedTextCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const wordCount = text ? text.trim().split(/\s+/).length : 0;
  const charCount = text ? text.length : 0;

  return (
    <Card className="shadow-xs border-slate-200">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-blue-700" />
            <CardTitle className="text-base font-bold text-slate-900">
              Raw Extracted Label Text (OCR Output)
            </CardTitle>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:inline">
              {wordCount} words • {charCount} chars
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!text}
              className="h-8 text-xs bg-white text-slate-700"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  <span>Copy Text</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        {text ? (
          <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs sm:text-sm leading-relaxed max-h-[300px] overflow-y-auto whitespace-pre-wrap selection:bg-blue-600 selection:text-white border border-slate-800 shadow-inner">
            {text}
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic py-4 text-center">
            No OCR text available for this inspection.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
