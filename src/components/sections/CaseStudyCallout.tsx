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
          className="relative overflow-hidden rounded-[24px] flex items-center justify-between gap-8 flex-col md:flex-row"
          style={{
            background: "linear-gradient(135deg, #F5F3FF 0%, #E0F2FE 50%, #F0FDFA 100%)",
            padding: "clamp(40px, 6vw, 64px) clamp(32px, 5vw, 64px)",
            maxWidth: "1000px",
            marginInline: "auto",
            border: "1px solid #E5E7EB",
          }}
        >
          {/* Decorative grid overlay */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "linear-gradient(rgba(124,58,237,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.03) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />

          <div>
            <span
              className="inline-flex items-center"
              style={{
                background: "#EDE9FE",
                borderRadius: "999px",
                padding: "6px 14px",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "#7C3AED",
                marginBottom: "16px",
              }}
            >
              📈 Case Study
            </span>
            <h3
              className="tracking-tight"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.5rem, 3vw, 2rem)",
                fontWeight: 700,
                color: "#1E293B",
                lineHeight: 1.2,
              }}
            >
              How InvoicePad closed $3,200 in new sales through Upwork in 6 weeks — without a dedicated sales team.
            </h3>
            <p
              style={{
                fontSize: "0.9375rem",
                color: "#64748B",
                marginTop: "8px",
              }}
            >
              A real example of Seerist finding buyers for a Notion template.
            </p>
          </div>
          <FadeUp delay={0.2}>
            <a
              href="#"
              className="inline-flex items-center gap-2 text-base font-semibold whitespace-nowrap transition-all duration-200 hover:bg-violet-50"
              style={{
                background: "white",
                color: "#7C3AED",
                borderRadius: "999px",
                padding: "14px 28px",
                textDecoration: "none",
                border: "1px solid #E5E7EB",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              Read the full story
              <span aria-hidden="true">→</span>
            </a>
          </FadeUp>
        </motion.div>
      </Container>
    </section>
  );
}
