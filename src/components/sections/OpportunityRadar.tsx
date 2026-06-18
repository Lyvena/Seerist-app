"use client";

import { motion } from "framer-motion";
import { Clock, Filter, Send } from "lucide-react";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { RadarGraphic } from "@/components/graphics/RadarGraphic";

const STEPS = [
  {
    icon: Clock,
    label: "Scan",
    title: "Seerist checks platforms every few minutes.",
    body: "New posts are captured before manual sellers even notice them.",
  },
  {
    icon: Filter,
    label: "Score",
    title: "Opportunities are ranked against your product.",
    body: "Relevance, budget fit, timing, and buyer intent become one simple score.",
  },
  {
    icon: Send,
    label: "Propose",
    title: "A tailored proposal is ready when you are.",
    body: "Review, edit, or enable Auto-propose for the highest-confidence matches.",
  },
];

export function OpportunityRadar() {
  return (
    <section className="relative overflow-hidden py-24">
      <div className="absolute inset-0 -z-10 bg-white" aria-hidden="true" />
      {/* Subtle gradient background for visual interest */}
      <div
        className="absolute inset-0 -z-10 opacity-60"
        aria-hidden="true"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 20% 20%, rgba(124,58,237,0.04) 0%, transparent 50%), radial-gradient(ellipse 50% 30% at 80% 10%, rgba(99,102,241,0.03) 0%, transparent 45%), radial-gradient(ellipse 40% 25% at 50% 90%, rgba(16,185,129,0.02) 0%, transparent 40%)",
        }}
      />
      <div className="absolute inset-0 -z-10 opacity-[0.04]" aria-hidden="true" style={{ backgroundImage: "linear-gradient(rgba(124,58,237,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.06) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
      <Container>
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <FadeUp>
              <SectionLabel className="border-violet-200 bg-violet-50/80 backdrop-blur">Opportunity Radar</SectionLabel>
            </FadeUp>
            <FadeUp delay={0.1}>
              <h2 className="mt-5 font-semibold tracking-tight text-gray-900" style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-hero)", lineHeight: 1.04, letterSpacing: "-0.03em" }}>
                See buyers before your competitors refresh their feeds.
              </h2>
            </FadeUp>
            <FadeUp delay={0.2}>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-600">
                Seerist turns scattered freelance platforms into a live signal feed. Every opportunity is scored, summarized, and converted into a proposal-ready brief.
              </p>
            </FadeUp>
<FadeUp delay={0.3}>
              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SignalCard value="14" label="platforms monitored" />
                <SignalCard value="2,400+" label="posts scanned daily" />
                <SignalCard value="30s" label="to proposal draft" />
              </div>
            </FadeUp>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <RadarGraphic />
          </motion.div>
        </div>

<div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <FadeUp key={step.label} delay={0.1 * index}>
              <div className="rounded-[24px] border border-violet-100 bg-violet-50/30 p-6 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-violet-50/50">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-widest text-violet-700">{step.label}</span>
                </div>
                <h3 className="mt-5 text-xl font-semibold text-gray-900" style={{ fontFamily: "var(--font-heading)" }}>{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{step.body}</p>
              </div>
            </FadeUp>
          ))}
        </div>
      </Container>
    </section>
  );
}

function SignalCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[22px] border border-violet-200 bg-white/90 p-5 shadow-sm">
      <p className="text-3xl font-semibold tracking-tight text-gray-900" style={{ fontFamily: "var(--font-heading)" }}>{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wider text-gray-600">{label}</p>
    </div>
  );
}
