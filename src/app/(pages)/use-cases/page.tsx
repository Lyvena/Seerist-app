import { Metadata } from "next";
import { HeroSection } from "@/components/sections/use-cases/HeroSection";
import { UseCasesGrid } from "@/components/sections/use-cases/UseCasesGrid";

export const metadata: Metadata = {
  title: "Use Cases — Seerist",
  description:
    "See how indie founders use Seerist to sell SaaS, templates, plugins, courses, and APIs through freelance platforms.",
};

export default function UseCasesPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <HeroSection />
      <UseCasesGrid />
    </div>
  );
}
