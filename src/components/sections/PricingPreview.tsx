"use client";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/animations/FadeUp";
import { PricingCards } from "@/components/sections/features/PricingCards";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useState } from "react";

export function PricingPreview() {
  const [annual, setAnnual] = useState(false);

  return (
    <section className="bg-white py-24">
      <Container>
        <div className="mb-12 text-center">
          <FadeUp>
            <SectionLabel className="mb-4">Simple Pricing</SectionLabel>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2
              className="text-3xl font-semibold tracking-tight md:text-4xl"
              style={{ fontFamily: "var(--font-heading)", color: "var(--color-text-1)" }}
            >
              Simple pricing — start free, upgrade when you&apos;re ready.
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <div className="mt-6 inline-flex items-center rounded-full border border-[var(--color-border)] bg-[#FAFAFA] p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                  !annual ? "bg-[var(--color-text-1)] text-white" : "text-[var(--color-text-3)] hover:text-[var(--color-text-1)]"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                  annual ? "bg-[var(--color-text-1)] text-white" : "text-[var(--color-text-3)] hover:text-[var(--color-text-1)]"
                }`}
              >
                Annual
              </button>
            </div>
          </FadeUp>
        </div>
        <PricingCards annual={annual} />
        <FadeUp delay={0.3}>
          <div className="mt-10 text-center">
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 text-base font-semibold text-violet-700 transition hover:gap-3"
              style={{ textDecoration: "none" }}
            >
              See full pricing details
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </FadeUp>
      </Container>
    </section>
  );
}
