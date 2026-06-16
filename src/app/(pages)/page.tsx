import { Hero } from "@/components/sections/Hero";
import { PlatformsMarquee } from "@/components/sections/PlatformsMarquee";
import { StatsSection } from "@/components/sections/StatsSection";
import { HowItWorks } from "@/components/sections/HowItWorks";
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
        <HowItWorks />
        <StatsSection />
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
