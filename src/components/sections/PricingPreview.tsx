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
            <SectionLabel>Simple Pricing</SectionLabel>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2
              className="tracking-tight"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(2rem, 4vw, 3.25rem)",
                color: "#111827",
              }}
            >
              One tool. Pay as you grow.
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p
              className="mx-auto mt-3 max-w-[560px]"
              style={{
                fontSize: "1.0625rem",
                color: "#6B7280",
                textAlign: "center",
              }}
            >
              Unlimited opportunities. Unlimited growth. No hidden fees or limits.
            </p>
          </FadeUp>
        </div>

        {/* Billing Toggle */}
        <FadeUp delay={0.25}>
          <div
            className="inline-flex items-center rounded-full"
            style={{
              background: "#F3F4F6",
              borderRadius: "999px",
              padding: "4px",
              marginTop: "24px",
              marginInline: "auto",
              display: "flex",
            }}
          >
            <button
              onClick={() => setAnnual(false)}
              className="rounded-full"
              style={{
                padding: "8px 20px",
                fontSize: "0.9375rem",
                fontWeight: 500,
                background: !annual ? "white" : "transparent",
                boxShadow: !annual ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                color: !annual ? "#111827" : "#6B7280",
                transition: "all 200ms ease",
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className="rounded-full"
              style={{
                padding: "8px 20px",
                fontSize: "0.9375rem",
                fontWeight: 500,
                background: annual ? "white" : "transparent",
                boxShadow: annual ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                color: annual ? "#111827" : "#6B7280",
                transition: "all 200ms ease",
              }}
            >
              Annual
              {annual && (
                <span
                  className="ml-2 inline-flex items-center"
                  style={{
                    background: "#ECFDF5",
                    color: "#059669",
                    borderRadius: "999px",
                    padding: "2px 10px",
                    fontSize: "0.75rem",
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
