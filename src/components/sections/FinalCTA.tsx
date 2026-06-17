"use client";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";

export function FinalCTA() {
  return (
    <section
      className="relative overflow-hidden py-24 text-white"
      style={{
        background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #4C1D95 100%)",
        backgroundSize: "400% 400%",
        animation: "gradient-shift 12s ease infinite",
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, transparent 0px, transparent 2px, currentColor 2px, currentColor 4px)",
        }}
        aria-hidden="true"
      />
      <Container>
        <div className="relative mx-auto max-w-3xl text-center">
          <FadeUp>
            <h2
              className="font-semibold tracking-tight text-white"
              style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-hero)", lineHeight: 1.04, letterSpacing: "-0.03em" }}
            >
              Start selling while your competitors are still manually checking Upwork.
            </h2>
          </FadeUp>
          <FadeUp delay={0.1}>
            <p className="mx-auto mt-6 max-w-xl text-lg text-white/80">
              Free forever. No credit card. Takes 5 minutes to set up.
            </p>
          </FadeUp>
          <FadeUp delay={0.2}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <a
                href="https://app.seerist.xyz/signup"
                className="inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-base font-semibold text-violet-700 transition hover:bg-gray-100"
                style={{ boxShadow: "0 8px 24px rgba(124,58,237,0.25)" }}
              >
                Get Started Free →
              </a>
              <a
                href="#"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/60 px-8 text-base font-medium text-white transition hover:border-white hover:bg-white/10"
              >
                Book a Demo →
              </a>
            </div>
          </FadeUp>
          <FadeUp delay={0.3}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-white/80">
              <span className="inline-flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                14 platforms monitored
              </span>
              <span className="inline-flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                7-day free trial on paid plans
              </span>
              <span className="inline-flex items-center gap-2">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
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
