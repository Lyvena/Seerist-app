"use client";
import { Container } from "@/components/ui/Container";
import { FadeUp } from "@/components/animations/FadeUp";
import { ScoringMockup } from "@/components/mockups/ScoringMockup";
import { ProposalDetailMockup } from "@/components/mockups/ProposalDetailMockup";
import { LiveFeedMockup } from "@/components/mockups/LiveFeedMockup";
import { PipelineMockup } from "@/components/mockups/PipelineMockup";
import { EmailMockup } from "@/components/mockups/EmailMockup";
import { ArrowRight } from "lucide-react";

const FEATURES = [
  {
    label: "Smart Filtering",
    title: "Every job post gets a score. You only see the ones worth your time.",
    body: "Seerist scores every opportunity 0–100 across relevance, budget fit, and timing. Set a threshold and only the best matches show up in your feed.",
    mockup: <ScoringMockup />,
    reverse: false,
  },
  {
    label: "AI Proposals",
    title: "Not a template. A real proposal written around their exact job post.",
    body: "Seerist reads the job post, understands your product, and writes a proposal that sounds like you — not like ChatGPT.",
    mockup: <ProposalDetailMockup />,
    reverse: true,
  },
  {
    label: "Always On",
    title: "New opportunities land in your feed the moment they're posted.",
    body: "Seerist scans all 14 platforms continuously. Matching posts appear in your live feed scored and proposal-ready within minutes of going live.",
    mockup: <LiveFeedMockup />,
    reverse: false,
  },
  {
    label: "Track Everything",
    title: "Every deal in one place — from discovery to closed.",
    body: "Track every opportunity through your pipeline automatically. See exactly where every deal stands and watch revenue metrics update in real time.",
    mockup: <PipelineMockup />,
    reverse: true,
  },
  {
    label: "Stay Informed",
    title: "Your daily briefing of top matches — in your inbox by 8am.",
    body: "Each morning, Seerist delivers a digest of your highest-scoring new opportunities. Click once to jump straight to the proposal generator.",
    mockup: <EmailMockup />,
    reverse: false,
  },
];

export function FeaturesSection() {
  return (
    <div style={{ padding: "var(--section-padding-y) 0" }}>
      <Container>
        <div className="mb-20 text-center">
          <FadeUp>
            <p className="section-label mb-4">Features</p>
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
              Everything you need to sell through freelance platforms.
            </h1>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto mt-5 max-w-[560px] text-[#5E6B8A]" style={{ fontSize: "var(--text-xl)" }}>
              Built for indie founders who ship great products but don&apos;t have time to manually hunt for buyers.
            </p>
          </FadeUp>
        </div>

        <div className="space-y-28">
          {FEATURES.map((feature, index) => (
            <FeatureBlock key={feature.label} {...feature} index={index} />
          ))}
        </div>
      </Container>
    </div>
  );
}

type FeatureBlockProps = {
  label: string;
  title: string;
  body: string;
  mockup: React.ReactNode;
  reverse: boolean;
  index: number;
};

function FeatureBlock({ label, title, body, mockup, reverse, index }: FeatureBlockProps) {
  return (
    <div
      className={`grid grid-cols-1 gap-10 lg:grid-cols-2 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}
      style={{ alignItems: "center" }}
    >
      <FadeUp delay={index * 0.05}>
        <div className="flex flex-col justify-center">
          <p className="section-label mb-4 w-fit">{label}</p>
          <h3
            className="mt-3 text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl text-[#0B1221]"
            style={{ fontFamily: "var(--font-heading)", lineHeight: 1.15, letterSpacing: "-0.025em" }}
          >
            {title}
          </h3>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-[#5E6B8A]">
            {body}
          </p>
          <a
            href="/signup"
            className="mt-6 inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-[#635BFF] transition-all group"
          >
            Try it free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </FadeUp>
      <FadeUp delay={index * 0.05 + 0.1}>{mockup}</FadeUp>
    </div>
  );
}
