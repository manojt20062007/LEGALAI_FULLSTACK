import React from "react";
import {
  Package,
  Tag,
  Building2,
  IndianRupee,
  Scale,
  Globe2,
  PhoneCall,
  Calendar,
  Layers,
  Check,
  AlertCircle,
} from "lucide-react";
import { ProductInfo } from "@/types/inspection";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";

interface ProductInfoCardProps {
  product?: ProductInfo | null;
}

export function ProductInfoCard({ product }: ProductInfoCardProps) {
  if (!product) {
    return (
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Product Declarations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 italic">No structured product data extracted.</p>
        </CardContent>
      </Card>
    );
  }

  const items = [
    {
      label: "Product Name",
      value: product.product_name,
      icon: Package,
      rule: "Rule 6(1)(a)",
    },
    {
      label: "Brand Name",
      value: product.brand,
      icon: Tag,
      rule: "Commercial Identifier",
    },
    {
      label: "Maximum Retail Price (MRP)",
      value: product.mrp,
      icon: IndianRupee,
      rule: "Rule 6(1)(e)",
      highlight: true,
    },
    {
      label: "Net Quantity / Standard Unit",
      value: product.net_quantity
        ? `${product.net_quantity} ${product.unit && !String(product.net_quantity).includes(product.unit) ? product.unit : ""}`
        : null,
      icon: Scale,
      rule: "Rule 12 & Sched. II",
      highlight: true,
    },
    {
      label: "Country of Origin",
      value: product.country_of_origin,
      icon: Globe2,
      rule: "Rule 6(10)",
    },
    {
      label: "Manufacturer / Packer Details",
      value: product.manufacturer || product.address,
      icon: Building2,
      rule: "Rule 6(1)(a)",
      fullWidth: true,
    },
    {
      label: "Consumer Care / Grievance Redressal",
      value: product.consumer_care || (product.phone || product.email ? `${product.phone || ""} ${product.email || ""}` : null),
      icon: PhoneCall,
      rule: "Rule 6(1)(h)",
      fullWidth: true,
    },
    {
      label: "Month & Year of Packaging / Mfg / Import",
      value: product.mfg_date || product.manufacturing_date,
      icon: Calendar,
      rule: "Rule 6(1)(c)",
      highlight: true,
    },
    {
      label: "Best Before / Expiry Date",
      value: product.best_before || product.expiry_date,
      icon: Calendar,
      rule: "Food Safety / PC Standard",
    },
    {
      label: "Batch / Lot Number",
      value: product.batch_no,
      icon: Layers,
      rule: "Rule 6(1)(g)",
    },
  ];

  // Filter items to show available ones, or mark mandatory missing ones
  return (
    <Card className="shadow-xs border-slate-200">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-700" />
            Mandatory Declarations (Legal Metrology Rules, 2011)
          </CardTitle>
          <span className="text-xs text-slate-500 font-medium hidden sm:inline-block">
            Standard Statutory Attributes
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item, idx) => {
            const hasValue = item.value !== undefined && item.value !== null && String(item.value).trim() !== "";
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border ${
                  item.fullWidth ? "md:col-span-2" : ""
                } ${
                  hasValue
                    ? item.highlight
                      ? "bg-blue-50/60 border-blue-200/80"
                      : "bg-slate-50/70 border-slate-200/80"
                    : "bg-rose-50/30 border-rose-100 opacity-80"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <item.icon className="w-3.5 h-3.5 text-slate-400" />
                    {item.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {item.rule}
                  </span>
                </div>

                <div className="mt-1">
                  {hasValue ? (
                    <p className={`text-sm font-semibold ${item.highlight ? "text-blue-900" : "text-slate-800"}`}>
                      {String(item.value)}
                    </p>
                  ) : (
                    <div className="flex items-center gap-1 text-xs text-rose-600 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Not detected / Missing on label</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
