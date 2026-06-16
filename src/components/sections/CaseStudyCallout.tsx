"use client";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { FadeUp } from "@/components/animations/FadeUp";

export function CaseStudyCallout() {
  return (
    <section className="py-20">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl px-8 py-16 text-center md:px-16"
          style={{
            background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
          }}
        >
          {/* Decorative corner sparkles */}
          <Sparkle className="absolute left-6 top-6 h-8 w-8 text-white/30" />
          <Sparkle className="absolute bottom-6 right-6 h-10 w-10 text-white/25" />
          <Sparkle className="absolute left-1/2 top-6 h-6 w-6 -translate-x-1/2 text-white/20" />

          <h3
            className="text-3xl font-semibold tracking-tight md:text-4xl"
            style={{ fontFamily: "var(--font-heading)", lineHeight: 1.1, color: "#FFFFFF" }}
          >
            📈 Case Study: How InvoicePad closed $3,200 in new sales through Upwork in 6 weeks — without a dedicated sales team.
          </h3>
          <FadeUp delay={0.2}>
            <a
              href="#"
              className="mt-6 inline-flex items-center gap-2 text-base font-medium text-white/80 transition hover:text-white"
              style={{ textDecoration: "none" }}
            >
              Read the full story
              <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
                →
              </span>
            </a>
          </FadeUp>
        </motion.div>
      </Container>
    </section>
  );
}

function Sparkle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" fill="currentColor" />
    </svg>
  );
}
