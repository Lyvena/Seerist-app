"use client";
import { Container } from "@/components/ui/Container";
import { FadeUp } from "@/components/animations/FadeUp";
import type { ReactNode } from "react";
import { TrendingUp } from "lucide-react";

type StatProps = {
  value: string;
  label: string;
  delay?: number;
  renderValue?: () => ReactNode;
  icon?: ReactNode;
};

function Stat({ value, label, delay = 0, renderValue, icon }: StatProps) {
  return (
    <FadeUp delay={delay}>
      <div className="flex flex-col items-center text-center px-6 py-4 relative">
        {icon && (
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEEDFF] text-[#635BFF]">
            {icon}
          </div>
        )}
        <div
          className="font-bold text-[#0B1221]"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(2.5rem, 4.5vw, 3.5rem)",
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          {renderValue ? renderValue() : value}
        </div>
        <p className="mt-2 text-[0.875rem] font-medium text-[#5E6B8A]">{label}</p>
      </div>
    </FadeUp>
  );
}

export function StatsSection() {
  return (
    <section style={{ padding: "var(--section-padding-y) 0" }}>
      <Container>
        <FadeUp>
          <div className="text-center mb-12">
            <p className="section-label mb-4">By the numbers</p>
            <h2
              className="tracking-tight text-[#0B1221]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              The reach you've been missing
            </h2>
          </div>
        </FadeUp>

        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-[960px] mx-auto"
        >
          <div className="rounded-2xl border border-[#EBEEF5] bg-white p-6" style={{ boxShadow: "var(--shadow-md)" }}>
            <Stat value="14" label="Platforms Monitored" delay={0} icon={<TrendingUp className="w-5 h-5" />} />
          </div>
          <div className="rounded-2xl border border-[#EBEEF5] bg-white p-6" style={{ boxShadow: "var(--shadow-md)" }}>
            <Stat value="2,400+" label="Opportunities Daily" delay={0.1} icon={<TrendingUp className="w-5 h-5" />} />
          </div>
          <div className="rounded-2xl border border-[#EBEEF5] bg-white p-6" style={{ boxShadow: "var(--shadow-md)" }}>
            <Stat
              value="< 30s"
              label="To Generate Proposal"
              delay={0.2}
              icon={<TrendingUp className="w-5 h-5" />}
              renderValue={() => (
                <span className="flex items-baseline justify-center gap-0.5">
                  <span className="text-3xl md:text-4xl tabular-nums">{"<"}30</span>
                  <span className="text-lg md:text-xl text-[#635BFF]">s</span>
                </span>
              )}
            />
          </div>
          <div className="rounded-2xl border border-[#EBEEF5] bg-white p-6" style={{ boxShadow: "var(--shadow-md)" }}>
            <Stat value="89%" label="Proposal Quality" delay={0.3} icon={<TrendingUp className="w-5 h-5" />} />
          </div>
        </div>
      </Container>
    </section>
  );
}
