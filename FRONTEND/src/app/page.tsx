import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ScanLine,
  Cpu,
  FileCheck2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Scale,
  Sparkles,
  BookOpen,
  LayoutDashboard,
  Building2,
  IndianRupee,
  Layers,
  Globe2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <div className="flex flex-col space-y-16 sm:space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 pb-12">
        {/* Background Subtle Grid */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#e2e8f015_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f015_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* LMPC Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs sm:text-sm font-semibold shadow-xs">
            <Scale className="w-4 h-4 text-blue-700" />
            <span>Legal Metrology (PC) Rules, 2011 Compliance</span>
          </div>

          {/* Headline & Tagline */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight sm:leading-none">
              <span className="text-blue-700">Scan. Verify. Report.</span>
              <br />
              <span className="text-slate-900 text-3xl sm:text-5xl mt-2 block font-bold">
                Automated Packaged Commodity Compliance
              </span>
            </h1>
            <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Verify statutory compliance for packaged goods under the{" "}
              <strong className="text-slate-800 font-semibold">
                Legal Metrology (Packaged Commodities) Rules, 2011
              </strong>{" "}
              by scanning product labels and package images.
            </p>
          </div>

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/inspection/new" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 text-white shadow-md">
                <span>Start New Inspection</span>
                <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>

            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <LayoutDashboard className="w-5 h-5 mr-1 text-slate-600" />
                <span>View Dashboard</span>
              </Button>
            </Link>
          </div>

          {/* Trust Banner / Rules Highlight */}
          <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-800">Rule 6(1)(e)</div>
                <div className="text-slate-500">MRP with Tax Statement</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-800">Rule 12</div>
                <div className="text-slate-500">Standard SI Net Quantity</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-800">Rule 6(10)</div>
                <div className="text-slate-500">Country of Origin Check</div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-800">Rule 6(1)(h)</div>
                <div className="text-slate-500">Consumer Care Grievance</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section (3-step explanation: Scan -> Analyze -> Verify) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center space-y-3 mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-blue-700">
            How It Works
          </h2>
          <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
            3-Step Automated Compliance Flow
          </h3>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            From product photograph to statutory audit report in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="relative bg-white border border-slate-200 rounded-2xl p-7 shadow-xs space-y-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
              <ScanLine className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Step 1
              </div>
              <h4 className="text-xl font-bold text-slate-900">Scan & Ingest</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Upload a clear photograph of the product packaging or principal display panel.
              Accepts JPG, PNG, and WEBP files.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative bg-white border border-slate-200 rounded-2xl p-7 shadow-xs space-y-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
              <Cpu className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Step 2
              </div>
              <h4 className="text-xl font-bold text-slate-900">Extract & Parse</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              FastAPI backend runs optical character recognition to extract MRP, Net Quantity,
              Country of Origin, Manufacturer details, and contact numbers.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative bg-white border border-slate-200 rounded-2xl p-7 shadow-xs space-y-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Step 3
              </div>
              <h4 className="text-xl font-bold text-slate-900">Verify & Report</h4>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              The rule engine flags missing declarations, formatting errors, and non-compliant
              price declarations, generating a printable audit report.
            </p>
          </div>
        </div>
      </section>

      {/* Problem Statement & Legal Metrology Context */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/60 border border-blue-700 text-blue-300 text-xs font-semibold">
                <span>The Problem Statement</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Ensuring Fair Trade & Transparency in Packaged Commodities
              </h3>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Under the Legal Metrology (Packaged Commodities) Rules, 2011, every pre-packaged
                commodity sold in India must bear mandatory statutory declarations. Manual market
                inspections are time-consuming and error-prone.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                LM-Verify provides an automated digital pipeline to assist inspectors, manufacturers,
                and consumers in checking statutory compliance instantly.
              </p>
              <div className="pt-2">
                <Link href="/rules">
                  <Button variant="outline" size="md" className="bg-transparent text-white border-slate-700 hover:bg-slate-800">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Read Legal Metrology Rules Guide
                  </Button>
                </Link>
              </div>
            </div>

            <div className="space-y-3 bg-slate-800/80 p-6 rounded-2xl border border-slate-700">
              <h4 className="font-semibold text-sm text-blue-400 uppercase tracking-wider">
                Mandatory Declarations Checked
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Rule 6(1)(a):</strong> Name & complete address of the manufacturer/packer</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Rule 6(1)(e):</strong> Maximum Retail Price (MRP) inclusive of all taxes</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Rule 12 & Sched II:</strong> Net quantity in standard SI weight/volume units</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Rule 6(10):</strong> Country of Origin for domestic & imported commodities</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Rule 6(1)(h):</strong> Consumer care phone number and email for grievances</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Box */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
        <div className="bg-gradient-to-br from-blue-700 to-indigo-900 text-white rounded-3xl p-10 sm:p-14 shadow-lg space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Verify a Product Package?
          </h2>
          <p className="text-blue-100 max-w-xl mx-auto text-sm sm:text-base">
            Upload a product label image to test Legal Metrology compliance with OCR extraction and rule checks.
          </p>
          <div>
            <Link href="/inspection/new">
              <Button size="lg" className="bg-white text-blue-900 hover:bg-slate-100 font-semibold shadow-md">
                <ScanLine className="w-5 h-5 mr-2 text-blue-700" />
                <span>Upload Product Image</span>
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
