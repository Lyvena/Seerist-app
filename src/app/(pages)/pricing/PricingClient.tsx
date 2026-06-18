"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";
import { PricingCards } from "@/components/sections/features/PricingCards";
import { ComparisonTable } from "@/components/sections/features/ComparisonTable";
import { PricingFAQ } from "@/components/sections/features/PricingFAQ";
import { MoneyBackBadge } from "@/components/sections/features/MoneyBackBadge";

export function PricingClient() {
  const [annual, setAnnual] = useState(false);

  return (
    <>
      <section className="pt-28 pb-12">
        <Container>
          <div className="mx-auto max-w-[640px] text-center">
            <FadeUp>
              <p className="section-label mb-4">Pricing</p>
            </FadeUp>
            <FadeUp delay={0.1}>
              <h1
                className="font-bold tracking-tight text-[#0B1221]"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(2.5rem, 5.5vw, 4rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.035em",
                }}
              >
                Start free. Scale when you're ready.
              </h1>
            </FadeUp>
            <FadeUp delay={0.2}>
              <p className="mx-auto mt-4 max-w-[440px] text-[1.0625rem] text-[#5E6B8A]">
                No hidden fees. No surprises. Upgrade only when you need more.
              </p>
            </FadeUp>
            <FadeUp delay={0.3}>
              <div
                className="mt-8 inline-flex items-center rounded-full mx-auto flex"
                style={{ background: "#F4F6FB", borderRadius: "999px", padding: "4px" }}
              >
                <button
                  onClick={() => setAnnual(false)}
                  className="rounded-full transition-all duration-200"
                  style={{
                    padding: "8px 20px",
                    fontSize: "0.9375rem",
                    fontWeight: 500,
                    background: !annual ? "white" : "transparent",
                    boxShadow: !annual ? "0 1px 4px rgba(11,18,33,0.08)" : "none",
                    color: !annual ? "#0B1221" : "#5E6B8A",
                  }}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setAnnual(true)}
                  className="relative rounded-full transition-all duration-200"
                  style={{
                    padding: "8px 20px",
                    fontSize: "0.9375rem",
                    fontWeight: 500,
                    background: annual ? "white" : "transparent",
                    boxShadow: annual ? "0 1px 4px rgba(11,18,33,0.08)" : "none",
                    color: annual ? "#0B1221" : "#5E6B8A",
                  }}
                >
                  Annual
                  {annual && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 rounded-full bg-[#00C2A8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                    >
                      -30%
                    </motion.span>
                  )}
                </button>
              </div>
            </FadeUp>
          </div>
        </Container>
      </section>

      <PricingCards annual={annual} />

      <section className="py-20">
        <Container>
          <FadeUp>
            <h2
              className="mb-10 text-center text-2xl font-bold tracking-tight md:text-3xl text-[#0B1221]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Compare every feature
            </h2>
          </FadeUp>
          <ComparisonTable />
        </Container>
      </section>

      <section className="py-20">
        <Container>
          <div className="mb-12 text-center">
            <FadeUp>
              <p className="section-label mb-4">FAQ</p>
            </FadeUp>
            <FadeUp delay={0.1}>
              <h2
                className="text-2xl font-bold tracking-tight md:text-3xl text-[#0B1221]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Questions about pricing
              </h2>
            </FadeUp>
          </div>
          <PricingFAQ />
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <MoneyBackBadge />
        </Container>
      </section>
    </>
  );
}
