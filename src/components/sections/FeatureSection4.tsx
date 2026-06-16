"use client";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { PipelineMockup } from "@/components/mockups/PipelineMockup";

export function FeatureSection4() {
  return (
    <section className="bg-[#FAFAFA] py-24">
      <Container>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:[&>*:first-child]:order-2">
          <FadeUp>
            <div className="flex flex-col justify-center">
              <SectionLabel>Track Everything</SectionLabel>
              <h3
                className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl"
                style={{ fontFamily: "var(--font-heading)", color: "var(--color-text-1)" }}
              >
                Every deal in one place — from discovery to closed.
              </h3>
              <p className="mt-4 text-lg leading-relaxed" style={{ color: "var(--color-text-2)" }}>
                Track every opportunity through your pipeline automatically. See exactly where every deal stands and watch revenue metrics update in real time.
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
            <PipelineMockup />
          </FadeUp>
        </div>
      </Container>
    </section>
  );
}
