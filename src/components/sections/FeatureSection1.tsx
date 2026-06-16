"use client";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ScoringMockup } from "@/components/mockups/ScoringMockup";

export function FeatureSection1() {
  return (
    <section className="py-24">
      <Container>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <FadeUp>
            <div className="flex flex-col justify-center">
              <SectionLabel>Smart Filtering</SectionLabel>
              <h3
                className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl"
                style={{ fontFamily: "var(--font-heading)", color: "var(--color-text-1)" }}
              >
                Every job post gets a score. You only see the ones worth your time.
              </h3>
              <p className="mt-4 text-lg leading-relaxed" style={{ color: "var(--color-text-2)" }}>
                Seerist scores every opportunity 0-100 across relevance, budget fit, and timing. Set a threshold and only the best matches show up in your feed.
              </p>
              <a
                href="#"
                className="mt-6 inline-flex items-center gap-2 text-base font-semibold text-violet-700 transition-all hover:gap-3"
                style={{ textDecoration: "none" }}
              >
                Learn more
                <span aria-hidden="true">→</span>
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
