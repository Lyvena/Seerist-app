"use client";
import { motion } from "framer-motion";
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
      <div className="flex flex-col items-center text-center md:px-8">
        <div
          className="font-semibold"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "var(--text-5xl)",
            color: "#7C3AED",
            lineHeight: 1.04,
            letterSpacing: "-0.03em",
          }}
        >
          {renderValue ? renderValue() : value}
        </div>
        <p className="mt-2 text-sm font-medium text-gray-600">{label}</p>
      </div>
    </FadeUp>
  );
}

export function StatsSection() {
  return (
    <section className="py-20" style={{ padding: "var(--section-padding-y) 0" }}>
      <Container>
        <div
          className="rounded-3xl bg-white p-10 md:p-14"
          style={{
            background: "linear-gradient(white, white) padding-box, linear-gradient(135deg, #7C3AED, #C4B5FD, #7C3AED) border-box",
            border: "1.5px solid transparent",
            borderRadius: "20px",
            boxShadow: "0 16px 48px rgba(124, 58, 237, 0.15)",
          }}
        >
          <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
            <Stat value="14" label="Platforms Monitored" delay={0} />
            <Stat value="2,400+" label="Opportunities Found Daily" delay={0.15} />
            <Stat
              value="< 30s"
              label="Time to Generate a Proposal"
              delay={0.3}
              renderValue={() => (
                <span className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl md:text-5xl tabular-nums text-violet-600">{"<"}30</span>
                  <span className="text-xl md:text-2xl text-violet-600">s</span>
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
