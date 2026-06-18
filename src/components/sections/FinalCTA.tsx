"use client";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";
import { ArrowRight, Sparkles } from "lucide-react";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden">
      <Container>
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #635BFF 0%, #8B5CF6 40%, #00C2A8 100%)",
            padding: "clamp(60px, 10vw, 100px) clamp(24px, 5vw, 80px)",
          }}
        >
          {/* Decorative elements */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div
              className="absolute top-0 left-0 w-full h-full"
              style={{
                background: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.1) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.08) 0%, transparent 40%)",
              }}
            />
            {/* Floating shapes */}
            <motion.div
              className="absolute top-[10%] right-[10%] w-32 h-32 rounded-full opacity-10"
              style={{ background: "white" }}
              animate={{ y: [-10, 10, -10], scale: [1, 1.05, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-[15%] left-[8%] w-20 h-20 rounded-full opacity-10"
              style={{ background: "white" }}
              animate={{ y: [10, -10, 10], scale: [1, 1.1, 1] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <div className="relative mx-auto max-w-[640px] text-center">
            <FadeUp>
              <h2
                className="font-bold tracking-tight text-white"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1.1,
                }}
              >
                Start selling while your competitors are still manually checking Upwork.
              </h2>
            </FadeUp>
            <FadeUp delay={0.1}>
              <p
                className="mx-auto text-white/85"
                style={{
                  fontSize: "clamp(1.0625rem, 1.8vw, 1.25rem)",
                  marginTop: "20px",
                  lineHeight: 1.6,
                }}
              >
                Free forever. No credit card. Takes 5 minutes to set up.
              </p>
            </FadeUp>
            <FadeUp delay={0.2}>
              <div
                className="flex flex-wrap items-center justify-center"
                style={{ gap: "14px", marginTop: "36px" }}
              >
                <motion.a
                  href="https://app.seerist.xyz/signup"
                  className="inline-flex items-center gap-2 h-[52px] rounded-full px-8 text-[1rem] font-semibold transition-all"
                  style={{ background: "white", color: "#635BFF" }}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.15)")}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
                >
                  <Sparkles className="w-4 h-4" />
                  Get Started Free
                </motion.a>
                <motion.a
                  href="#"
                  className="inline-flex items-center gap-2 h-[52px] rounded-full border-2 border-white/30 px-7 text-[1rem] font-medium transition-all"
                  style={{ color: "white" }}
                  whileHover={{ scale: 1.03, y: -2, borderColor: "rgba(255,255,255,0.6)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  Book a Demo
                  <ArrowRight className="w-4 h-4" />
                </motion.a>
              </div>
            </FadeUp>
            <FadeUp delay={0.3}>
              <div
                className="flex flex-wrap items-center justify-center text-white/70"
                style={{ fontSize: "0.875rem", marginTop: "32px", gap: "8px" }}
              >
                {["14 platforms", "Free forever", "Cancel anytime"].map((item, i) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    {i > 0 && <span className="text-white/30">·</span>}
                    {item}
                  </span>
                ))}
              </div>
            </FadeUp>
          </div>
        </div>
      </Container>
    </section>
  );
}
