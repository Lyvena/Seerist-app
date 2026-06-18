"use client";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ProposalDetailMockup } from "@/components/mockups/ProposalDetailMockup";

export function FeatureSection2() {
  return (
    <section
      className="overflow-hidden"
      style={{
        padding: "clamp(80px, 12vw, 140px) 0",
        background: "#FAFAFA",
      }}
    >
      <Container>
        <div
          className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:[&>*:first-child]:order-2"
          style={{
            maxWidth: "1200px",
            marginInline: "auto",
            gap: "clamp(48px, 6vw, 96px)",
            alignItems: "center",
          }}
        >
          <FadeUp>
            <div className="flex flex-col justify-center relative">
              <div
                className="absolute -left-4 top-0 w-10 h-px mb-4"
                style={{ background: "linear-gradient(90deg, #7C3AED, #A855F7)", borderRadius: "999px" }}
              />
              <SectionLabel>AI Proposals</SectionLabel>
              <h3
                className="mt-4 tracking-tight text-gray-900"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(1.75rem, 3vw, 2.75rem)",
                  fontWeight: 700,
                  letterSpacing: "-0.025em",
                  lineHeight: 1.15,
                  marginBottom: "20px",
                }}
              >
                Not a template. A real proposal written around their exact job post.
              </h3>
              <p
                className="text-[1.0625rem] text-[#6B7280] max-w-[480px]"
                style={{ lineHeight: 1.7, marginBottom: "28px" }}
              >
                Seerist reads the job post, understands your product, and writes a proposal that sounds like you — not like ChatGPT.
              </p>
              <a
                href="/#features"
                className="inline-flex items-center gap-2 text-[0.9375rem] font-medium text-violet-600 transition-all"
                style={{
                  textDecoration: "none",
                  borderBottom: "1px solid transparent",
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = "#7C3AED"}
                onMouseLeave={(e) => e.currentTarget.style.borderBottomColor = "transparent"}
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
