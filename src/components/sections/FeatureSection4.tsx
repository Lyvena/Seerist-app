"use client";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";
import { PipelineMockup } from "@/components/mockups/PipelineMockup";
import { LayoutGrid, ArrowRight } from "lucide-react";

export function FeatureSection4() {
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
                <LayoutGrid className="w-3.5 h-3.5" />
                Track Everything
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
                Every deal in one place — from discovery to closed.
              </h3>
              <p className="mt-4 text-[1.0625rem] text-[#5E6B8A] max-w-[480px]" style={{ lineHeight: 1.7 }}>
                Track every opportunity through your pipeline automatically. See exactly where every deal stands and watch revenue metrics update in real time.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {["Kanban pipeline", "Revenue forecast", "Deal tracking"].map((tag) => (
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
            <PipelineMockup />
          </FadeUp>
        </div>
      </Container>
    </section>
  );
}
