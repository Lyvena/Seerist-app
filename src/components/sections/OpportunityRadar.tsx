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
      <div className="absolute inset-0 -z-10 bg-slate-950" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.35),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.25),transparent_35%),radial-gradient(circle_at_50%_90%,rgba(16,185,129,0.16),transparent_30%)]" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 opacity-[0.12]" aria-hidden="true" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />
      <Container>
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <FadeUp>
              <SectionLabel className="border-white/15 bg-white/10 text-white backdrop-blur">Opportunity Radar</SectionLabel>
            </FadeUp>
            <FadeUp delay={0.1}>
              <h2 className="mt-5 font-semibold tracking-tight text-white" style={{ fontFamily: "var(--font-heading)", fontSize: "var(--text-hero)", lineHeight: 1.04, letterSpacing: "-0.03em" }}>
                See buyers before your competitors refresh their feeds.
              </h2>
            </FadeUp>
            <FadeUp delay={0.2}>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/72">
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
              <div className="rounded-[24px] border border-white/10 bg-white/8 p-6 shadow-lg backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/12">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-widest text-white/60">{step.label}</span>
                </div>
                <h3 className="mt-5 text-xl font-semibold text-white" style={{ fontFamily: "var(--font-heading)" }}>{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/62">{step.body}</p>
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
    <div className="rounded-[22px] border border-white/10 bg-white/8 p-5 backdrop-blur-xl">
      <p className="text-3xl font-semibold tracking-tight text-white" style={{ fontFamily: "var(--font-heading)" }}>{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wider text-white/58">{label}</p>
    </div>
  );
}
