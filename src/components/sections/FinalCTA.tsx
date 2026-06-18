"use client";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";

export function FinalCTA() {
  return (
    <section
      className="relative overflow-hidden text-white"
      style={{
        background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 40%, #4C1D95 100%)",
        minHeight: "480px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(80px, 12vw, 120px) clamp(20px, 5vw, 80px)",
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent 0px, transparent 2px, currentColor 2px, currentColor 4px)",
        }}
      />
      <Container>
        <div className="relative mx-auto max-w-[700px] text-center">
          <FadeUp>
            <h2
              className="font-bold tracking-tight"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1.08,
              }}
            >
              Start selling while your competitors are still manually{" "}
              <span style={{ whiteSpace: "nowrap" }}>checking Upwork.</span>
            </h2>
          </FadeUp>
          <FadeUp delay={0.1}>
            <p
              className="mx-auto"
              style={{
                fontSize: "1.1875rem",
                color: "rgba(255,255,255,0.8)",
                marginTop: "20px",
              }}
            >
              Free forever. No credit card. Takes 5 minutes to set up.
            </p>
          </FadeUp>
          <FadeUp delay={0.2}>
            <div
              className="flex flex-wrap items-center justify-center"
              style={{
                gap: "12px",
                marginTop: "40px",
              }}
            >
              <a
                href="https://app.seerist.xyz/signup"
                className="inline-flex h-[56px] items-center justify-center rounded-[999px] px-[32px] text-[1.0625rem] font-semibold transition"
                style={{
                  background: "white",
                  color: "#7C3AED",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F5F3FF")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
              >
                Get Started Free →
              </a>
              <a
                href="#"
                className="inline-flex h-[56px] items-center justify-center rounded-[999px] border px-[28px] text-[1.0625rem] font-medium transition"
                style={{
                  background: "transparent",
                  color: "white",
                  borderColor: "rgba(255,255,255,0.4)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.7)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Book a Demo
              </a>
            </div>
          </FadeUp>
          <FadeUp delay={0.3}>
            <div
              className="flex flex-wrap items-center justify-center"
              style={{
                fontSize: "0.9375rem",
                color: "rgba(255,255,255,0.65)",
                marginTop: "40px",
                gap: "8px",
              }}
            >
              <span className="inline-flex items-center gap-1">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                14 platforms
              </span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
              <span className="inline-flex items-center gap-1">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                7-day trial on paid
              </span>
              <span style={{ color: "rgba(255,255,255,0.3)" }}>·</span>
              <span className="inline-flex items-center gap-1">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Cancel any time
              </span>
            </div>
          </FadeUp>
        </div>
      </Container>
    </section>
  );
}
