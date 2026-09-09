"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, ExternalLink, Scale, CheckCircle2 } from "lucide-react";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  return (
    <footer className="w-full border-t border-slate-200 bg-white py-8 text-slate-600 text-xs no-print mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: System info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-700 flex items-center justify-center text-white">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-900 text-base">LM-Verify</span>
            </div>
            <p className="text-slate-500 leading-relaxed max-w-md">
              Automated compliance verification system for Packaged Commodities under Legal
              Metrology (Packaged Commodities) Rules, 2011. Designed for market surveillance,
              quality audit, and consumer protection.
            </p>
            <div className="flex items-center gap-2 text-slate-400">
              <Scale className="w-3.5 h-3.5" />
              <span>Prototype (V1 MVP)</span>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 text-sm">Navigation</h4>
            <ul className="space-y-1.5">
              <li>
                <Link href="/" className="hover:text-blue-600 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
                  Inspection Dashboard
                </Link>
              </li>
              <li>
                <Link href="/inspection/new" className="hover:text-blue-600 transition-colors">
                  Upload Product Label
                </Link>
              </li>
              <li>
                <Link href="/rules" className="hover:text-blue-600 transition-colors">
                  LMPC Rules Reference
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal Metrology Specs */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 text-sm">Rules Verified</h4>
            <ul className="space-y-1.5 text-slate-500">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Rule 6(1)(e): MRP with Taxes</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Rule 12: Net Quantity Standard SI</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Rule 6(10): Country of Origin</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Rule 6(1)(h): Consumer Grievance</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar & Disclaimer */}
        <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-400">
            © {new Date().getFullYear()} LM-Verify. Automated Preliminary Assessment System.
          </p>
          <div className="text-slate-400 text-center sm:text-right">
            <span>FastAPI Backend: </span>
            <code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
              http://localhost:8000
            </code>
          </div>
        </div>
      </div>
    </footer>
  );
}
