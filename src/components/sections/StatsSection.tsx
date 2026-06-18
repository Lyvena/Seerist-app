"use client";
import { Container } from "@/components/ui/Container";
import { FadeUp } from "@/components/animations/FadeUp";
import type { ReactNode } from "react";

type StatProps = {
  value: string;
  label: string;
  delay?: number;
  renderValue?: () => ReactNode;
};

function Stat({ value, label, delay = 0, renderValue }: StatProps) {
  return (
    <FadeUp delay={delay}>
      <div className="flex flex-col items-center text-center px-5 py-5 relative">
        <div
          className="font-bold"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(2.5rem, 5vw, 4rem)",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            background: "linear-gradient(135deg, #7C3AED, #6366F1)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: "8px",
            display: "block",
          }}
        >
          {renderValue ? renderValue() : value}
        </div>
        <p className="text-[0.9375rem] font-normal text-[#6B7280]" style={{ lineHeight: 1.4 }}>
          {label}
        </p>
      </div>
    </FadeUp>
  );
}

function StatWithDivider({ value, label, delay = 0, renderValue, showDivider = false }: StatProps & { showDivider?: boolean }) {
  return (
    <div className="relative">
      <Stat value={value} label={label} delay={delay} renderValue={renderValue} />
      {showDivider && (
        <div
          className="hidden md:block absolute right-0 top-[20%] h-[60%]"
          style={{
            width: "1px",
            background: "#E5E7EB",
          }}
        />
      )}
    </div>
  );
}

export function StatsSection() {
  return (
    <section className="py-20" style={{ padding: "var(--section-padding-y) 0" }}>
      <Container>
        <div
          className="bg-white border border-[#E5E7EB] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
          style={{
            borderRadius: "24px",
            padding: "clamp(40px, 6vw, 72px)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            maxWidth: "1000px",
            marginInline: "auto",
            gap: 0,
          }}
        >
          <StatWithDivider value="14" label="Platforms Monitored" delay={0} showDivider={true} />
          <StatWithDivider value="2,400+" label="Opportunities Found Daily" delay={0.15} showDivider={true} />
          <StatWithDivider
            value="< 30s"
            label="Time to Generate a Proposal"
            delay={0.3}
            renderValue={() => (
              <span className="flex items-baseline justify-center gap-1">
                <span className="text-4xl md:text-5xl tabular-nums" style={{ background: "linear-gradient(135deg, #7C3AED, #6366F1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{"<"}30</span>
                <span className="text-xl md:text-2xl" style={{ color: "#7C3AED" }}>s</span>
              </span>
            )}
            showDivider={true}
          />
          <Stat value="89%" label="Proposal quality rating" delay={0.45} />
        </div>
      </Container>
    </section>
  );
}
