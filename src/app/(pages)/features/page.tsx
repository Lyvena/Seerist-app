import type { Metadata } from "next";
import { FeaturesSection } from "@/components/sections/features/FeaturesSection";

export const metadata: Metadata = {
  title: "Features — Seerist",
  description:
    "Every tool you need to sell through freelance platforms. Discovery, proposals, live feed, pipeline, analytics, and digests.",
};

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#FAFBFE]">
      <FeaturesSection />
    </div>
  );
}
