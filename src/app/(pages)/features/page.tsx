import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features — Seerist",
  description:
    "Every tool you need to sell through freelance platforms. Discovery, proposals, live feed, pipeline, analytics, and digests.",
};

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { FeaturesSection } from "@/components/sections/features/FeaturesSection";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-32">
            <div className="h-12 w-12 rounded-full border-4 border-violet-600/20 border-t-violet-600 animate-spin" />
          </div>
        }
      >
        <FeaturesSection />
      </Suspense>
    </div>
  );
}
