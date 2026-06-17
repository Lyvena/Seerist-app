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
                className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl text-gray-900"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                New opportunities land in your feed the moment they&apos;re posted.
              </h3>
              <p className="mt-4 text-lg leading-relaxed text-gray-600">
                Seerist scans all 14 platforms continuously. Matching posts appear in your live feed scored and proposal-ready within minutes of going live.
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
            <LiveFeedMockup />
          </FadeUp>
        </div>
      </Container>
    </section>
  );
}
