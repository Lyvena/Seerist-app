"use client";

import { BarChart3, Brain, Mail, Radar, Zap } from "lucide-react";
import { FadeUp } from "@/components/animations/FadeUp";
import { StaggerContainer } from "@/components/animations/StaggerContainer";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { EmailMockup } from "@/components/mockups/EmailMockup";
import { LiveFeedMockup } from "@/components/mockups/LiveFeedMockup";
import { PipelineMockup } from "@/components/mockups/PipelineMockup";
import { ProposalDetailMockup } from "@/components/mockups/ProposalDetailMockup";
import { ScoringMockup } from "@/components/mockups/ScoringMockup";

type Feature = {
  label: string;
  title: string;
  body: string;
  icon: typeof Radar;
  metric: string;
  children: React.ReactNode;
  span?: "wide" | "tall";
};

const FEATURES: Feature[] = [
  {
    label: "Smart Filtering",
    title: "Only high-intent buyers reach your feed.",
    body: "Seerist scores every post against your product, budget, and timing so you spend time on opportunities that can actually convert.",
    icon: Radar,
    metric: "94 avg. top-match score",
    children: <ScoringMockup />,
    span: "wide",
  },
  {
    label: "AI Proposals",
    title: "Personalized pitches generated from the job post.",
    body: "Every proposal references the buyer's exact problem, your strongest feature, and the clearest next step.",
    icon: Brain,
    metric: "30s average draft time",
    children: <ProposalDetailMockup />,
  },
  {
    label: "Always On",
    title: "New opportunities appear the moment they go live.",
    body: "Continuous scanning keeps your pipeline fresh across freelance platforms, remote boards, and niche marketplaces.",
    icon: Zap,
    metric: "24/7 monitoring",
    children: <LiveFeedMockup />,
  },
  {
    label: "Pipeline Analytics",
    title: "See every discovery, proposal, and reply in one place.",
    body: "Track deal stage, platform performance, and projected revenue without copying data between spreadsheets.",
    icon: BarChart3,
    metric: "Live revenue view",
    children: <PipelineMockup />,
  },
  {
    label: "Daily Digest",
    title: "Wake up to your best matches, already ranked.",
    body: "A concise inbox briefing highlights the highest-scoring opportunities and lets you jump straight into proposal generation.",
    icon: Mail,
    metric: "8am every morning",
    children: <EmailMockup />,
  },
];

export function FeatureMatrix({ variant = "home" }: { variant?: "home" | "page" }) {
  return (
    <section id="features" className="relative overflow-hidden py-24">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.10),transparent_30%)]" aria-hidden="true" />
      <Container>
        {variant === "page" && (
          <div className="mx-auto mb-16 max-w-4xl text-center">
            <FadeUp>
              <SectionLabel>Product OS</SectionLabel>
            </FadeUp>
            <FadeUp delay={0.1}>
              <h1 className="mt-5 font-semibold tracking-tight text-slate-950" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(40px,6vw,72px)", lineHeight: 1.05, letterSpacing: "-0.04em" }}>
                A complete sales engine for products that need buyers.
              </h1>
            </FadeUp>
            <FadeUp delay={0.2}>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
                Seerist connects product discovery, AI proposal writing, pipeline tracking, and reporting into one workflow built for indie founders.
              </p>
            </FadeUp>
          </div>
        )}

        {variant === "home" && (
          <div className="mx-auto mb-14 max-w-4xl text-center">
            <FadeUp>
              <SectionLabel>Built for outbound that feels inbound</SectionLabel>
            </FadeUp>
            <FadeUp delay={0.1}>
              <h2 className="mt-5 font-semibold tracking-tight text-slate-950" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(38px,6vw,70px)", lineHeight: 1.05, letterSpacing: "-0.04em" }}>
                Every part of the freelance sales loop, automated.
              </h2>
            </FadeUp>
            <FadeUp delay={0.2}>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
                Stop checking platforms manually. Seerist finds buyers, ranks opportunities, writes proposals, and keeps your pipeline moving.
              </p>
            </FadeUp>
          </div>
        )}

        <StaggerContainer>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <FeatureCard key={feature.label} feature={feature} index={index} />
            ))}
          </div>
        </StaggerContainer>
      </Container>
    </section>
  );
}

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const Icon = feature.icon;

  return (
    <FadeUp delay={index * 0.06}>
      <div className={`group relative overflow-hidden rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)] ${feature.span === "wide" ? "lg:col-span-2" : ""}`}>
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.12),transparent_36%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200">
                <Icon className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-700">{feature.label}</span>
            </div>
            <h3 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl" style={{ fontFamily: "var(--font-heading)" }}>{feature.title}</h3>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-600">{feature.body}</p>
          </div>
          <span className="hidden rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 md:inline-flex">{feature.metric}</span>
        </div>
        <div className="mt-6 rounded-[24px] border border-violet-100 bg-slate-50/70 p-3">{feature.children}</div>
      </div>
    </FadeUp>
  );
}
