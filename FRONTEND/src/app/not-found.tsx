import React from "react";
import Link from "next/link";
import { FileQuestion, ArrowLeft, Home, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
        <FileQuestion className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">404 - Page Not Found</h1>
        <p className="text-sm text-slate-500">
          The requested inspection record or page could not be located in LM-Verify.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Link href="/">
          <Button variant="outline" size="md">
            <Home className="w-4 h-4 mr-1.5" />
            Home
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button size="md" className="bg-blue-700 hover:bg-blue-800 text-white">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Go to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
