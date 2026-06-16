"use client";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { FadeUp } from "@/components/animations/FadeUp";
import { CountUp } from "@/components/animations/CountUp";
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
      <div className="flex flex-col items-center text-center md:px-8">
        <div
          className="font-semibold"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(48px, 6vw, 80px)",
            color: "var(--color-accent)",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
          }}
        >
          {renderValue ? renderValue() : value}
        </div>
        <p className="mt-2 text-sm font-medium" style={{ color: "var(--color-text-3)" }}>
          {label}
        </p>
      </div>
    </FadeUp>
  );
}

export function StatsSection() {
  return (
    <section className="py-20">
      <Container>
        <div
          className="gradient-border rounded-3xl bg-white p-10 md:p-14"
          style={{ borderRadius: "var(--radius-xl)" }}
        >
          <div className="grid grid-cols-1 gap-10 md:grid-cols-4 md:divide-x" style={{ borderColor: "var(--color-border)" }}>
            <Stat value="14" label="Platforms Monitored" delay={0} />
            <Stat value="2,400+" label="Opportunities Found Daily" delay={0.15} />
            <Stat
              value="< 30s"
              label="Time to Generate a Proposal"
              delay={0.3}
              renderValue={() => (
                <span className="flex items-baseline justify-center gap-1">
                  <CountUp to={30} duration={1.2} suffix="s" decimals={0} className="tabular-nums" />
                  <span className="text-4xl md:text-5xl" style={{ color: "var(--color-accent)" }}>
                    {"<"}
                  </span>
                </span>
              )}
            />
            <Stat value="89%" label="User-reported proposal quality rating" delay={0.45} />
          </div>
        </div>
      </Container>
    </section>
  );
}
