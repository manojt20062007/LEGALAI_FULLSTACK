import React from "react";
import Link from "next/link";
import {
  BookOpen,
  Scale,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  FileText,
  ShieldCheck,
  ExternalLink,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

export default function RulesReferencePage() {
  const rules = [
    {
      id: "Rule 6(1)(a)",
      title: "Name & Complete Address of Manufacturer / Packer / Importer",
      summary:
        "Every package must specify the complete name and registered address of the manufacturer, packer, or importer, including postal PIN code for geographic identification.",
      category: "Entity Identification",
      mandatory: true,
    },
    {
      id: "Rule 6(1)(e)",
      title: "Maximum Retail Price (MRP) & Tax Declaration",
      summary:
        "MRP must be printed with the mandatory phrase '(Inclusive of all taxes)' or 'Incl. of all taxes'. Rounding off and currency notation must conform to standard Indian statutory rules.",
      category: "Pricing & Taxation",
      mandatory: true,
    },
    {
      id: "Rule 12 & Schedule II",
      title: "Standard Units of Weight or Measure (Net Quantity)",
      summary:
        "Net quantity must be declared using standard SI units (e.g. g, kg, ml, l, m, cm, N). Non-standard units (e.g., lbs, oz, ft) or ambiguous qualifiers (e.g., 'approx') are strictly non-compliant.",
      category: "Net Quantity Standards",
      mandatory: true,
    },
    {
      id: "Rule 6(10)",
      title: "Country of Origin / Manufacture",
      summary:
        "Mandatory for all domestic and imported goods. The package must clearly declare 'Country of Origin: [Country]' or 'Made in [Country]'.",
      category: "Origin & Trade Compliance",
      mandatory: true,
    },
    {
      id: "Rule 6(1)(h)",
      title: "Consumer Care & Grievance Redressal Mechanism",
      summary:
        "Every package must clearly state the name, address, telephone number, and email address of the person or office that can be contacted in case of consumer complaints.",
      category: "Consumer Rights",
      mandatory: true,
    },
    {
      id: "Rule 6(1)(d)",
      title: "Month and Year of Manufacture / Pre-Packaging",
      summary:
        "Month and year in which the commodity is manufactured, packed, or imported must be legibly printed (e.g., '01/2026' or 'Jan 2026').",
      category: "Date & Freshness",
      mandatory: true,
    },
    {
      id: "Rule 6(1)(g)",
      title: "Batch, Lot, or Code Number",
      summary:
        "A distinct batch or code number allowing traceability and quality control throughout the supply chain.",
      category: "Traceability",
      mandatory: true,
    },
    {
      id: "Rule 6(11)",
      title: "Unit Sale Price (Post-2022 Amendment)",
      summary:
        "For packages containing more than 1 kg or 1 liter, the unit sale price per gram, kilogram, milliliter, or liter must be declared alongside the total MRP.",
      category: "Price Transparency",
      mandatory: true,
    },
    {
      id: "Rule 7 & Table 1",
      title: "Minimum Height of Numerals & Principal Display Panel (PDP)",
      summary:
        "Font size and numeral height of net quantity and MRP must satisfy minimum area and millimeter height standards based on package area.",
      category: "Typography & Legibility",
      mandatory: true,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 w-full">
      {/* Back button */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200">
          <BookOpen className="w-3.5 h-3.5 text-blue-700" />
          <span>Statutory Framework</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Legal Metrology (Packaged Commodities) Rules, 2011
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
          Statutory standards enforced by the Department of Consumer Affairs, Government of India.
          LM-Verify evaluates product packaging photography against these core provisions.
        </p>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rules.map((rule, idx) => (
          <Card key={idx} className="shadow-xs border-slate-200 hover:border-blue-300 transition-all">
            <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  {rule.id}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {rule.category}
                </span>
              </div>
              <CardTitle className="text-base font-bold text-slate-900 mt-2">
                {rule.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 text-sm text-slate-600 leading-relaxed">
              {rule.summary}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick CTA */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 sm:p-8 text-center space-y-4">
        <h3 className="text-xl font-bold text-slate-900">
          Ready to verify a product against these rules?
        </h3>
        <p className="text-sm text-slate-600 max-w-lg mx-auto">
          Upload any packaged commodity photo to automatically detect and validate each mandatory declaration.
        </p>
        <Link href="/inspection/new">
          <Button size="md" className="bg-blue-700 hover:bg-blue-800 text-white font-medium">
            <PlusCircle className="w-4 h-4 mr-1.5" />
            <span>Start an Inspection</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
