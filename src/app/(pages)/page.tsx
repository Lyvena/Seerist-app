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

export default function Home() {
  return (
    <>
      <Hero />
      <main>
        <PlatformsMarquee />
        <StatsSection />
        <HowItWorks />
        <FeatureSection1 />
        <FeatureSection2 />
        <FeatureSection3 />
        <FeatureSection4 />
        <FeatureSection5 />
        <LogosSection />
        <Testimonials />
        <CaseStudyCallout />
        <PricingPreview />
        <FaqSection />
        <FinalCTA />
      </main>
    </>
  );
}
