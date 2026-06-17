"use client";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ProposalDetailMockup } from "@/components/mockups/ProposalDetailMockup";

export function FeatureSection2() {
  return (
    <section className="bg-gray-50/50 py-24">
      <Container>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:[&>*:first-child]:order-2">
          <FadeUp>
            <div className="flex flex-col justify-center">
              <SectionLabel>AI Proposals</SectionLabel>
              <h3
                className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl text-gray-900"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Not a template. A real proposal written around their exact job post.
              </h3>
              <p className="mt-4 text-lg leading-relaxed text-gray-600">
                Seerist reads the job post, understands your product, and writes a proposal that sounds like you — not like ChatGPT.
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
            <ProposalDetailMockup />
          </FadeUp>
        </div>
      </Container>
    </section>
  );
}
