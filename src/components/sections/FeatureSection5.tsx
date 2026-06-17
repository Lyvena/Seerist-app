"use client";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { EmailMockup } from "@/components/mockups/EmailMockup";

export function FeatureSection5() {
  return (
    <section className="py-24" style={{ padding: "var(--section-padding-y) 0" }}>
      <Container>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <FadeUp>
            <div className="flex flex-col justify-center">
              <SectionLabel>Stay Informed</SectionLabel>
              <h3
                className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl text-gray-900"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Your daily briefing of top matches — in your inbox by 8am.
              </h3>
              <p className="mt-4 text-lg leading-relaxed text-gray-600">
                Each morning, Seerist delivers a digest of your highest-scoring new opportunities. Click once to jump straight to the proposal generator.
              </p>
              <a
                href="/#features"
                className="mt-6 inline-flex items-center gap-2 text-base font-semibold text-violet-600 transition-all hover:gap-3"
              >
                Learn more
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </FadeUp>
          <FadeUp delay={0.1}>
            <EmailMockup />
          </FadeUp>
        </div>
      </Container>
    </section>
  );
}
