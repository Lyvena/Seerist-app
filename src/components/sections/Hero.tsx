"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { GradientText } from "@/components/ui/GradientText";
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
      <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-indigo-50/30" aria-hidden="true" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "radial-gradient(circle at 0% 0%, rgba(124,58,237,0.15) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(99,102,241,0.1) 0%, transparent 50%)",
        }}
        aria-hidden="true"
      />

      <Container>
        <motion.div style={{ y, opacity }} className="flex min-h-screen flex-col items-center justify-center pt-24 pb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.2 }}
          >
            <SectionLabel>🎯 AI-Powered Sales on Autopilot</SectionLabel>
          </motion.div>

          <h1
            className="mt-8 font-semibold tracking-tight text-gray-900"
            style={{
              fontFamily: "var(--font-heading)",
              lineHeight: 1.04,
              letterSpacing: "-0.03em",
              fontSize: "var(--text-hero)",
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

          <motion.p
            className="mx-auto mt-8 max-w-[560px] text-lg leading-relaxed md:text-xl"
            style={{ color: "#4B5563" }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.85 }}
          >
            Seerist monitors Upwork, Freelancer, Contra and 11 more platforms for buyers who need exactly what you
            built — then writes the proposal. You just confirm and hit send.
          </motion.p>

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
              className="inline-flex w-full md:w-auto min-w-[44px] h-[52px] items-center justify-center rounded-full bg-violet-600 px-7 text-base font-semibold text-white transition-colors hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
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
              className="inline-flex w-full md:w-auto min-w-[44px] h-[52px] items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-7 text-base font-medium text-gray-700 transition hover:border-gray-300 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
            >
              See How It Works
              <span aria-hidden="true">↓</span>
            </motion.button>
          </motion.div>

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
                  className="h-9 w-9 rounded-full border-2 border-white bg-gradient-to-br from-violet-400 to-indigo-500"
                  style={{ marginLeft: i > 0 ? "-10px" : undefined, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
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

          <motion.div
            className="mt-16 w-full max-w-[960px]"
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
