import { Metadata } from "next";
import { StepsSection } from "@/components/sections/how-it-works/StepsSection";
import { TimelineSection } from "@/components/sections/how-it-works/TimelineSection";

export const metadata: Metadata = {
  title: "How It Works — Seerist",
  description:
    "From product description to closed deal in six simple steps.",
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <StepsSection />
      <TimelineSection />
    </div>
  );
}
