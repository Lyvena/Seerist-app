"use client";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/animations/FadeUp";
import { PricingCards } from "@/components/sections/features/PricingCards";
import { Container } from "@/components/ui/Container";
import { useState } from "react";
import { CreditCard, ArrowRight } from "lucide-react";

export function PricingPreview() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="relative">
      <Container>
        <div className="text-center mb-12">
          <FadeUp>
            <p className="section-label mb-4">
              <CreditCard className="w-3.5 h-3.5" />
              Pricing
            </p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2
              className="tracking-tight text-[#0B1221]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Start free. Scale when you're ready.
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto mt-3 max-w-[480px] text-[1.0625rem] text-[#5E6B8A]">
              No hidden fees. No surprises. Upgrade only when you need more.
            </p>
          </FadeUp>
        </div>

        {/* Billing Toggle */}
        <FadeUp delay={0.25}>
          <div
            className="inline-flex items-center rounded-full mx-auto flex"
            style={{
              background: "#F4F6FB",
              borderRadius: "999px",
              padding: "4px",
              marginTop: "24px",
            }}
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
              className="rounded-full transition-all duration-200"
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
                <span
                  className="ml-2 inline-flex items-center"
                  style={{
                    background: "#E0FAF6",
                    color: "#059669",
                    borderRadius: "999px",
                    padding: "2px 8px",
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                  }}
                >
                  Save 30%
                </span>
              )}
            </button>
          </div>
        </FadeUp>

        <PricingCards annual={annual} />
        <FadeUp delay={0.3}>
          <div className="mt-8 text-center">
            <a
              href="/pricing"
              className="inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-[#635BFF] transition-all group"
            >
              See full pricing details
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </FadeUp>
      </Container>
    </section>
  );
}
