import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Use Cases — Seerist",
  description:
    "See how indie founders use Seerist to sell SaaS, templates, plugins, courses, and APIs through freelance platforms.",
};

import { HeroSection } from "@/components/sections/use-cases/HeroSection";
import { UseCasesGrid } from "@/components/sections/use-cases/UseCasesGrid";
import { SectionDivider } from "@/components/ui/SectionDivider";

export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-[#FAFBFE]">
      <HeroSection />
      <SectionDivider />
      <UseCasesGrid />
    </div>
  );
}
