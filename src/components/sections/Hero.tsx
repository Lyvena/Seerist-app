"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { GradientText } from "@/components/ui/GradientText";
import { Container } from "@/components/ui/Container";
import { HeroMockup } from "@/components/mockups/HeroMockup";
import type { ReactNode } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div
          className="orb-violet"
          style={{
            position: "absolute",
            top: "-120px",
            right: "-120px",
            width: "520px",
            height: "520px",
            borderRadius: "50%",
            background: "#7C3AED",
            opacity: 0.12,
            filter: "blur(120px)",
            animation: "float 8s ease-in-out infinite",
          }}
        />
        <div
          className="orb-indigo"
          style={{
            position: "absolute",
            bottom: "-140px",
            left: "-140px",
            width: "480px",
            height: "480px",
            borderRadius: "50%",
            background: "#6366F1",
            opacity: 0.10,
            filter: "blur(120px)",
            animation: "float 8s ease-in-out infinite 2s",
          }}
        />
      </div>

      <Container>
        <div className="flex min-h-screen flex-col items-center justify-center pt-24 pb-20 text-center">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.2 }}
          >
            <SectionLabel>🎯 AI-Powered Sales on Autopilot</SectionLabel>
          </motion.div>

          {/* Headline */}
          <h1
            className="mt-8 font-semibold tracking-tight text-gray-900"
            style={{
              fontFamily: "var(--font-heading)",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              fontSize: "clamp(48px, 7vw, 96px)",
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
              <GradientText>Freelance Platform.</GradientText>
            </motion.span>
          </h1>

          {/* Subheadline */}
          <motion.p
            className="mx-auto mt-8 max-w-[560px] text-lg leading-relaxed md:text-xl"
            style={{ color: "var(--color-text-3)" }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.85 }}
          >
            Seerist monitors Upwork, Freelancer, Contra and 11 more platforms for buyers who need exactly what you
            built — then writes the proposal. You just confirm and hit send.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            className="mt-10 flex flex-wrap items-center justify-center gap-3"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 1.0 }}
          >
            <motion.a
              href="https://app.seerist.xyz/signup"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex h-[52px] items-center justify-center rounded-full bg-[#7C3AED] px-7 text-base font-semibold text-white transition-colors hover:bg-[#6D28D9]"
              style={{ boxShadow: "0 8px 24px rgba(124,58,237,0.35)" }}
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
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-7 text-base font-medium text-gray-700 transition hover:border-gray-500 hover:text-gray-900"
            >
              See How It Works
              <span aria-hidden="true">↓</span>
            </motion.button>
          </motion.div>

          {/* Social proof */}
          <motion.div
            className="mt-10 flex items-center justify-center gap-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 1.15 }}
          >
            <div className="flex items-center">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full border-2 border-white bg-gradient-to-br from-violet-400 to-indigo-500"
                  style={{ marginLeft: i > 0 ? "-10px" : undefined }}
                />
              ))}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">Joined by 200+ indie founders</p>
              <div className="flex items-center gap-1 text-amber-500">
                {"★★★★★"}
                <span className="ml-1 text-xs text-gray-600">4.9/5 rating</span>
              </div>
            </div>
          </motion.div>

          {/* Hero mockup */}
          <motion.div
            className="mt-16 w-full max-w-[960px]"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease, delay: 1.3 }}
          >
            <HeroMockup />
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
