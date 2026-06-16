"use client";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { FadeIn } from "@/components/animations/FadeIn";
import { SectionLabel } from "@/components/ui/SectionLabel";

const LOGOS = [
  "Notion",
  "Webflow",
  "Framer",
  "Lemon Squeezy",
  "Gumroad",
  "Stripe",
  "ConvertKit",
  "Beehiiv",
];

export function LogosSection() {
  return (
    <section className="overflow-hidden py-16">
      <Container>
        <div className="relative mb-10">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-[var(--color-border)]" />
          </div>
          <p className="relative mx-auto w-fit bg-[#FAFAFA] px-4 text-center text-sm font-medium text-[var(--color-text-3)]">
            Seerist helps you sell products built on:
          </p>
        </div>
        <FadeIn>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 md:gap-x-16">
            {LOGOS.map((name) => (
              <span
                key={name}
                className="text-lg font-semibold text-[var(--color-text-3)] transition-all duration-300 hover:text-[var(--color-text-1)]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {name}
              </span>
            ))}
          </div>
        </FadeIn>
        <div className="relative mt-10">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-[var(--color-border)]" />
          </div>
        </div>
      </Container>
    </section>
  );
}
