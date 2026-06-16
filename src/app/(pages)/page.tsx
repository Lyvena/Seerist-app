import { Hero } from "@/components/sections/Hero";
import { PlatformsMarquee } from "@/components/sections/PlatformsMarquee";
import { StatsSection } from "@/components/sections/StatsSection";
import { HowItWorks } from "@/components/sections/HowItWorks";

export default function Home() {
  return (
    <>
      <Hero />
      <main>
        <PlatformsMarquee />
        <HowItWorks />
        <StatsSection />
      </main>
    </>
  );
}

