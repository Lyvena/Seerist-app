"use client";
import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { FadeUp } from "@/components/animations/FadeUp";
import { ArrowRight, TrendingUp } from "lucide-react";

export function CaseStudyCallout() {
  return (
    <section className="py-16">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl"
          style={{
            background: "linear-gradient(135deg, #EEEDFF 0%, #E0F2FE 40%, #E0FAF6 100%)",
            border: "1px solid #DDD6FE",
          }}
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none" aria-hidden="true">
            <div
              className="absolute inset-0"
              style={{
                background: "radial-gradient(circle, rgba(99,91,255,0.08) 0%, transparent 70%)",
              }}
            />
          </div>

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 p-8 md:p-12">
            <div className="flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[0.75rem] font-semibold text-[#635BFF] border border-[#C7C3FF] mb-4">
                <TrendingUp className="w-3 h-3" />
                Case Study
              </span>
              <h3
                className="tracking-tight text-[#0B1221]"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)",
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                How InvoicePad closed $3,200 in new sales through Upwork in 6 weeks — without a dedicated sales team.
              </h3>
              <p className="mt-2 text-[0.9375rem] text-[#5E6B8A]">
                A real example of Seerist finding buyers for a SaaS invoicing tool.
              </p>
            </div>
            <FadeUp delay={0.2}>
              <a
                href="#"
                className="inline-flex items-center gap-2 text-[0.9375rem] font-semibold whitespace-nowrap transition-all duration-200 group"
                style={{
                  background: "white",
                  color: "#635BFF",
                  borderRadius: "999px",
                  padding: "14px 28px",
                  textDecoration: "none",
                  border: "1px solid #C7C3FF",
                  boxShadow: "0 2px 12px rgba(99,91,255,0.08)",
                }}
              >
                Read the full story
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </FadeUp>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
