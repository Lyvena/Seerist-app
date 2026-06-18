import type { Metadata } from "next";
import { StepsSection } from "@/components/sections/how-it-works/StepsSection";

export const metadata: Metadata = {
  title: "How It Works — Seerist",
  description:
    "From product description to closed deal in three simple steps.",
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#FAFBFE]">
      <StepsSection />
    </div>
  );
}
