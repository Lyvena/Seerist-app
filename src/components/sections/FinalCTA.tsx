"use client";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";

export function FinalCTA() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(165deg, #7C3AED 0%, #6366F1 30%, #0EA5E9 70%, #0D9488 100%)",
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
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.3) 0, transparent 20%), radial-gradient(circle at 80% 10%, rgba(255,255,255,0.2) 0, transparent 30%)",
        }}
      />
      <Container>
        <div className="relative mx-auto max-w-[700px] text-center">
          <FadeUp>
            <h2
              className="font-bold tracking-tight text-white"
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
              className="mx-auto text-white/90"
              style={{
                fontSize: "1.1875rem",
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
                gap: "16px",
                marginTop: "40px",
              }}
            >
              <motion.a
                href="https://app.seerist.xyz/signup"
                className="inline-flex h-[56px] items-center justify-center rounded-[999px] px-[32px] text-[1.0625rem] font-semibold transition"
                style={{
                  background: "white",
                  color: "#7C3AED",
                }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 8px 24px rgba(124,58,237,0.3)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
              >
                Get Started Free →
              </motion.a>
              <motion.a
                href="#"
                className="inline-flex h-[56px] items-center justify-center rounded-[999px] border px-[28px] text-[1.0625rem] font-medium transition"
                style={{
                  background: "rgba(255,255,255,0.9)",
                  color: "#7C3AED",
                  borderColor: "rgba(255,255,255,0.6)",
                }}
                whileHover={{ scale: 1.03, y: -2, background: "rgba(255,255,255,1)" }}
                whileTap={{ scale: 0.98 }}
              >
                Book a Demo
              </motion.a>
            </div>
          </FadeUp>
          <FadeUp delay={0.3}>
            <div
              className="flex flex-wrap items-center justify-center text-white/80"
              style={{
                fontSize: "0.9375rem",
                marginTop: "40px",
                gap: "12px",
              }}
            >
              <span className="inline-flex items-center gap-1">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                14 platforms
              </span>
              <span className="text-white/40">·</span>
              <span className="inline-flex items-center gap-1">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                7-day trial on paid
              </span>
              <span className="text-white/40">·</span>
              <span className="inline-flex items-center gap-1">
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
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
