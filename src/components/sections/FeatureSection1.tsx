"use client";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";
import { ScoringMockup } from "@/components/mockups/ScoringMockup";
import { Target, ArrowRight } from "lucide-react";

export function FeatureSection1() {
  return (
    <section id="features" className="relative overflow-hidden">
      <Container>
        <div
          className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center"
          style={{ gap: "clamp(40px, 6vw, 80px)" }}
        >
          <FadeUp>
            <div className="flex flex-col justify-center">
              <p className="section-label mb-4 w-fit">
                <Target className="w-3.5 h-3.5" />
                Smart Filtering
              </p>
              <h3
                className="mt-3 tracking-tight text-[#0B1221]"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.15,
                }}
              >
                Every job post gets a score. You only see the ones worth your time.
              </h3>
              <p className="mt-4 text-[1.0625rem] text-[#5E6B8A] max-w-[480px]" style={{ lineHeight: 1.7 }}>
                Seerist scores every opportunity 0–100 across relevance, budget fit, and timing. Set a threshold and only the best matches show up in your feed.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {["Relevance scoring", "Budget alignment", "Timing analysis"].map((tag) => (
                  <span key={tag} className="inline-flex items-center rounded-full bg-[#EEEDFF] px-3 py-1 text-[0.8125rem] font-medium text-[#635BFF]">
                    {tag}
                  </span>
                ))}
              </div>
              <a
                href="/features"
                className="inline-flex items-center gap-2 mt-6 text-[0.9375rem] font-semibold text-[#635BFF] transition-all group"
              >
                Learn more
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <ScoringMockup />
          </FadeUp>
        </div>
      </Container>
    </section>
  );
}
