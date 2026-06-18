import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { PlatformsMarquee } from "@/components/sections/PlatformsMarquee";
import { StatsSection } from "@/components/sections/StatsSection";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { FeatureSection1 } from "@/components/sections/FeatureSection1";
import { FeatureSection2 } from "@/components/sections/FeatureSection2";
import { FeatureSection3 } from "@/components/sections/FeatureSection3";
import { FeatureSection4 } from "@/components/sections/FeatureSection4";
import { Testimonials } from "@/components/sections/Testimonials";
import { CaseStudyCallout } from "@/components/sections/CaseStudyCallout";
import { PricingPreview } from "@/components/sections/PricingPreview";
import { FaqSection } from "@/components/sections/FaqSection";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { SectionDivider } from "@/components/ui/SectionDivider";

export const metadata: Metadata = {
  title: "AI Business Development for SaaS",
  description:
    "Seerist analyzes your SaaS product and finds perfect freelance projects that need exactly what you've built. AI-powered matching, proposals, and pipeline for indie founders.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Seerist",
  applicationCategory: "BusinessApplication",
  description:
    "AI-powered sales automation for SaaS founders. Monitor freelance platforms and generate proposals automatically.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free plan available",
  },
  url: "https://seerist.xyz",
  operatingSystem: "Web",
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero />
      <main>
        <PlatformsMarquee />
        <SectionDivider />
        <StatsSection />
        <SectionDivider />
        <div style={{ padding: "var(--section-padding-y) 0" }}>
          <HowItWorks />
        </div>
        <SectionDivider />
        <div style={{ padding: "var(--section-padding-y) 0" }}>
          <FeatureSection1 />
        </div>
        <div style={{ padding: "var(--section-padding-y) 0" }}>
          <FeatureSection2 />
        </div>
        <div style={{ padding: "var(--section-padding-y) 0" }}>
          <FeatureSection3 />
        </div>
        <div style={{ padding: "var(--section-padding-y) 0" }}>
          <FeatureSection4 />
        </div>
        <SectionDivider />
        <div style={{ padding: "var(--section-padding-y) 0" }}>
          <Testimonials />
        </div>
        <SectionDivider />
        <CaseStudyCallout />
        <div style={{ padding: "var(--section-padding-y) 0" }}>
          <PricingPreview />
        </div>
        <SectionDivider />
        <div style={{ padding: "var(--section-padding-y) 0" }}>
          <FaqSection />
        </div>
        <SectionDivider />
        <div style={{ padding: "var(--section-padding-y) 0" }}>
          <FinalCTA />
        </div>
      </main>
    </>
  );
}
