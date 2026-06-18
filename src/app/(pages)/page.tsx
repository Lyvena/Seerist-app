import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { PlatformsMarquee } from "@/components/sections/PlatformsMarquee";
import { StatsSection } from "@/components/sections/StatsSection";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { FeatureSection1 } from "@/components/sections/FeatureSection1";
import { FeatureSection2 } from "@/components/sections/FeatureSection2";
import { FeatureSection3 } from "@/components/sections/FeatureSection3";
import { FeatureSection4 } from "@/components/sections/FeatureSection4";
import { FeatureSection5 } from "@/components/sections/FeatureSection5";
import { LogosSection } from "@/components/sections/LogosSection";
import { Testimonials } from "@/components/sections/Testimonials";
import { CaseStudyCallout } from "@/components/sections/CaseStudyCallout";
import { PricingPreview } from "@/components/sections/PricingPreview";
import { FaqSection } from "@/components/sections/FaqSection";
import { FinalCTA } from "@/components/sections/FinalCTA";
import { SectionDivider } from "@/components/ui/SectionDivider";

export const metadata: Metadata = {
  title: "Sell Automatically on Freelance Platforms",
  description:
    "Seerist monitors 14 freelance platforms for buyers who need exactly what you built — then writes the proposal. Automatic sales for indie SaaS founders.",
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
        <HowItWorks />
        <FeatureSection1 />
        <FeatureSection2 />
        <FeatureSection3 />
        <FeatureSection4 />
        <FeatureSection5 />
        <LogosSection />
        <SectionDivider />
        <Testimonials />
        <SectionDivider />
        <CaseStudyCallout />
        <PricingPreview />
        <FaqSection />
        <SectionDivider />
        <FinalCTA />
      </main>
    </>
  );
}