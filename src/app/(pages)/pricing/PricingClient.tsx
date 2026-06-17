"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { PricingCards } from "@/components/sections/features/PricingCards";
import { ComparisonTable } from "@/components/sections/features/ComparisonTable";
import { PricingFAQ } from "@/components/sections/features/PricingFAQ";
import { MoneyBackBadge } from "@/components/sections/features/MoneyBackBadge";

const ease = [0.16, 1, 0.3, 1] as const;

export function PricingClient() {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <section className="pt-24 pb-16 bg-gray-50/50">
        <Container>
          <div className="mx-auto max-w-[700px] text-center">
            <FadeUp>
              <SectionLabel className="mb-4">Simple Pricing</SectionLabel>
            </FadeUp>
            <FadeUp delay={0.1}>
              <h1
                className="font-semibold tracking-tight text-gray-900"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(40px, 6vw, 72px)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.03em",
                }}
              >
                One tool. Pay as you grow.
              </h1>
            </FadeUp>
            <FadeUp delay={0.2}>
              <p
                className="mx-auto mt-5 max-w-xl text-lg text-gray-600"
              >
                Start free. Upgrade when Seerist has already paid for itself.
              </p>
            </FadeUp>
            <FadeUp delay={0.3}>
              <div className="mt-8 inline-flex items-center rounded-full border border-gray-200 bg-white p-1">
                <button
                  onClick={() => setAnnual(false)}
                  className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                    !annual
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setAnnual(true)}
                  className={`relative rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                    annual
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Annual
                  {annual && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                    >
                      Save 30%
                    </motion.span>
                  )}
                </button>
              </div>
            </FadeUp>
          </div>
        </Container>
      </section>

      <PricingCards annual={annual} />

      <section className="py-20 bg-white">
        <Container>
          <FadeUp>
            <h2
              className="mb-10 text-center text-3xl font-semibold tracking-tight md:text-4xl text-gray-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Compare every feature
            </h2>
          </FadeUp>
          <ComparisonTable />
        </Container>
      </section>

      <section className="bg-white py-24">
        <Container>
          <div className="mb-16 text-center">
            <FadeUp>
              <SectionLabel>FAQ</SectionLabel>
            </FadeUp>
            <FadeUp delay={0.1}>
              <h2
                className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl text-gray-900"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Questions about pricing
              </h2>
            </FadeUp>
          </div>
          <PricingFAQ />
        </Container>
      </section>

      <section className="pb-24 bg-gray-50/50">
        <Container>
          <MoneyBackBadge />
        </Container>
      </section>
    </>
  );
}
