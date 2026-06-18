"use client";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";

export function HeroSection() {
  return (
    <section className="pt-28 pb-16 relative">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 60% 40% at 50% 20%, rgba(99,91,255,0.05) 0%, transparent 60%)",
          }}
        />
      </div>

      <Container>
        <div className="mx-auto max-w-3xl text-center relative">
          <FadeUp>
            <p className="section-label mb-4">Use Cases</p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h1
              className="font-bold tracking-tight text-[#0B1221]"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "var(--text-hero)",
                lineHeight: 1.05,
                letterSpacing: "-0.035em",
              }}
            >
              Whatever you've built — Seerist finds you buyers.
            </h1>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto mt-5 max-w-[520px] text-[#5E6B8A]" style={{ fontSize: "var(--text-xl)" }}>
              Seerist works for any digital product that solves a problem.
              Here's how different types of indie founders use it.
            </p>
          </FadeUp>
        </div>
      </Container>
    </section>
  );
}
