"use client";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { LiveFeedMockup } from "@/components/mockups/LiveFeedMockup";

export function FeatureSection3() {
  return (
    <section className="py-24">
      <Container>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <FadeUp>
            <div className="flex flex-col justify-center">
              <SectionLabel>Always On</SectionLabel>
              <h3
                className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl"
                style={{ fontFamily: "var(--font-heading)", color: "var(--color-text-1)" }}
              >
                New opportunities land in your feed the moment they&apos;re posted.
              </h3>
              <p className="mt-4 text-lg leading-relaxed" style={{ color: "var(--color-text-2)" }}>
                Seerist scans all 14 platforms continuously. Matching posts appear in your live feed scored and proposal-ready within minutes of going live.
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
            <LiveFeedMockup />
          </FadeUp>
        </div>
      </Container>
    </section>
  );
}
