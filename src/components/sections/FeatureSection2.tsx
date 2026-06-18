"use client";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";
import { ProposalDetailMockup } from "@/components/mockups/ProposalDetailMockup";
import { Wand2, ArrowRight } from "lucide-react";

export function FeatureSection2() {
  return (
    <section className="relative overflow-hidden" style={{ background: "#F4F6FB" }}>
      <Container>
        <div
          className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:[&>*:first-child]:order-2 items-center"
          style={{ gap: "clamp(40px, 6vw, 80px)" }}
        >
          <FadeUp>
            <div className="flex flex-col justify-center">
              <p className="section-label mb-4 w-fit">
                <Wand2 className="w-3.5 h-3.5" />
                AI Proposals
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
                Not a template. A real proposal written around their exact job post.
              </h3>
              <p className="mt-4 text-[1.0625rem] text-[#5E6B8A] max-w-[480px]" style={{ lineHeight: 1.7 }}>
                Seerist reads the job post, understands your product, and writes a proposal that sounds like you — not like ChatGPT.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {["Tone matching", "Product-aware", "Job-specific"].map((tag) => (
                  <span key={tag} className="inline-flex items-center rounded-full bg-[#E0FAF6] px-3 py-1 text-[0.8125rem] font-medium text-[#059669]">
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
            <ProposalDetailMockup />
          </FadeUp>
        </div>
      </Container>
    </section>
  );
}
