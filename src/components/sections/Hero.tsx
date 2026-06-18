"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { HeroMockup } from "@/components/mockups/HeroMockup";

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3]);

  return (
    <section ref={ref} className="relative min-h-screen overflow-hidden">
      {/* Premium gradient background */}
      <div
        className="absolute inset-0"
        aria-hidden="true"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(99,102,241,0.06) 0%, transparent 60%), #FAFAFA",
        }}
      />

      {/* Decorative orbs */}
      <div
        className="absolute -z-10"
        aria-hidden="true"
        style={{
          top: "-80px",
          right: "10%",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute -z-10"
        aria-hidden="true"
        style={{
          bottom: 0,
          left: "5%",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(60px)",
        }}
      />

      <Container>
        <motion.div style={{ y, opacity }} className="relative z-10 flex min-h-screen flex-col items-center justify-center pt-[calc(64px+64px)] pb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.2 }}
          >
            <SectionLabel>🎯 AI-Powered Sales on Autopilot</SectionLabel>
          </motion.div>

          <h1
            className="mt-8 font-bold tracking-tight text-gray-900"
            style={{
              fontFamily: "var(--font-heading)",
              lineHeight: 1.04,
              letterSpacing: "-0.035em",
              fontSize: "clamp(3.5rem, 7.5vw, 6rem)",
              textAlign: "center",
              maxWidth: "900px",
              marginInline: "auto",
            }}
          >
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease, delay: 0.4 }}
            >
              Sell Your SaaS
            </motion.span>
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease, delay: 0.55 }}
            >
              Through Every
            </motion.span>
            <motion.span
              className="block"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease, delay: 0.7 }}
            >
              <span
                style={{
                  background: "linear-gradient(135deg, #7C3AED 20%, #A855F7 60%, #6366F1 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Freelance Platform.
              </span>
            </motion.span>
          </h1>

          <motion.p
            className="mx-auto mt-24 max-w-[580px] text-center"
            style={{
              fontSize: "clamp(1.05rem, 2vw, 1.25rem)",
              color: "#6B7280",
              lineHeight: 1.7,
              marginInline: "auto",
            }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.85 }}
          >
            Seerist monitors Upwork, Freelancer, Contra and 11 more platforms for buyers who need exactly what you
            built — then writes the proposal. You just confirm and hit send.
          </motion.p>

          <motion.div
            className="mt-40 flex flex-wrap items-center justify-center gap-3"
            style={{ display: "flex", justifyContent: "center", alignItems: "center" }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 1.0 }}
          >
            <motion.a
              href="https://app.seerist.xyz/signup"
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex h-14 items-center justify-center rounded-full bg-violet-600 px-8 text-[1.0625rem] font-semibold text-white transition-all"
              style={{
                transition: "all 250ms ease",
                boxShadow: "0 8px 32px rgba(124,58,237,0.30)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#6D28D9";
                e.currentTarget.style.boxShadow = "0 12px 40px rgba(124,58,237,0.40)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#7C3AED";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(124,58,237,0.30)";
              }}
            >
              Start Free — No Card Needed
            </motion.a>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const el = document.getElementById("how-it-works");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex h-14 items-center justify-center rounded-full border px-7 text-[1.0625rem] font-medium transition-all"
              style={{
                background: "white",
                borderColor: "#E5E7EB",
                color: "#374151",
                borderRadius: "999px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#9CA3AF";
                e.currentTarget.style.color = "#111827";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#E5E7EB";
                e.currentTarget.style.color = "#374151";
              }}
            >
              See How It Works
            </motion.button>
          </motion.div>

          <motion.div
            className="mt-48 flex flex-wrap items-center justify-center gap-4"
            style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 1.15 }}
          >
            <div className="flex items-center">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full border-2 border-white bg-gradient-to-br from-violet-400 to-indigo-500"
                  style={{ marginLeft: i > 0 ? "-8px" : undefined }}
                />
              ))}
            </div>
            <div className="w-1 h-1 rounded-full bg-gray-300" />
            <p className="text-[0.9375rem] font-medium text-gray-700">200+ indie founders</p>
            <div className="flex items-center gap-1" style={{ color: "#7C3AED" }}>
              <span className="text-[0.9375rem]">★★★★★</span>
              <span className="text-[0.9375rem] text-gray-700">4.9/5</span>
            </div>
          </motion.div>

          <motion.div
            className="mt-72 w-full max-w-[800px]"
            style={{ position: "relative" }}
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease, delay: 1.3 }}
          >
            <HeroMockup />
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
