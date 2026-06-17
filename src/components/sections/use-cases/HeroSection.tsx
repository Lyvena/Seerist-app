"use client";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";

export function HeroSection() {
  return (
    <section className="pt-24 pb-16">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <FadeUp>
            <h1
              className="font-semibold tracking-tight text-[var(--color-text-1)]"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "var(--text-hero)",
                lineHeight: 1.04,
                letterSpacing: "-0.03em",
              }}
            >
              Whatever you&apos;ve built — Seerist finds you buyers.
            </h1>
          </FadeUp>
          <FadeUp delay={0.1}>
            <p className="mx-auto mt-6 max-w-2xl text-gray-600" style={{ fontSize: "var(--text-xl)" }}>
              Seerist works for any digital product that solves a problem.
              Here&apos;s how different types of indie founders use it.
            </p>
          </FadeUp>
        </div>
      </Container>
    </section>
  );
}
