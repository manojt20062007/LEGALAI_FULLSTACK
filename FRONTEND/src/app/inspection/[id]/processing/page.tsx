import React from "react";
import { ProcessingProgress } from "@/components/inspection/ProcessingProgress";

interface PageProps {
  params: {
    id: string;
  };
}

export default function ProcessingPage({ params }: PageProps) {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full flex items-center justify-center min-h-[70vh]">
      <ProcessingProgress inspectionId={params.id} />
    </div>
  );
}
