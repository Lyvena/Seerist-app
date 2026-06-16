"use client";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ProposalDetailMockup } from "@/components/mockups/ProposalDetailMockup";

export function FeatureSection2() {
  return (
    <section className="bg-[#FAFAFA] py-24">
      <Container>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:[&>*:first-child]:order-2">
          <FadeUp>
            <div className="flex flex-col justify-center">
              <SectionLabel>AI Proposals</SectionLabel>
              <h3
                className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl"
                style={{ fontFamily: "var(--font-heading)", color: "var(--color-text-1)" }}
              >
                Not a template. A real proposal written around their exact job post.
              </h3>
              <p className="mt-4 text-lg leading-relaxed" style={{ color: "var(--color-text-2)" }}>
                Seerist reads the job post, understands your product, and writes a proposal that sounds like you — not like ChatGPT.
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
            <ProposalDetailMockup />
          </FadeUp>
        </div>
      </Container>
    </section>
  );
}
