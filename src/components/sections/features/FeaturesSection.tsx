"use client";
import { Container } from "@/components/ui/Container";
import { FadeUp } from "@/components/animations/FadeUp";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { ScoringMockup } from "@/components/mockups/ScoringMockup";
import { ProposalDetailMockup } from "@/components/mockups/ProposalDetailMockup";
import { LiveFeedMockup } from "@/components/mockups/LiveFeedMockup";
import { PipelineMockup } from "@/components/mockups/PipelineMockup";
import { EmailMockup } from "@/components/mockups/EmailMockup";

const FEATURES = [
  {
    label: "Smart Filtering",
    title: "Every job post gets a score. You only see the ones worth your time.",
    body: "Seerist scores every opportunity 0-100 across relevance, budget fit, and timing. Set a threshold and only the best matches show up in your feed.",
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
    <div className="py-24">
      <Container>
        <div className="mb-20 text-center">
          <FadeUp>
            <SectionLabel>Features</SectionLabel>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h1
              className="font-semibold tracking-tight text-[var(--color-text-1)]"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(40px, 6vw, 72px)",
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
              }}
            >
              Everything you need to sell through freelance platforms.
            </h1>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto mt-5 max-w-2xl text-lg" style={{ color: "var(--color-text-3)" }}>
              Built for indie founders who ship great products but don&apos;t have time to manually hunt for buyers.
            </p>
          </FadeUp>
        </div>

        <div className="space-y-24">
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
      className={`grid grid-cols-1 gap-12 lg:grid-cols-2 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}
    >
      <FadeUp delay={index * 0.05}>
        <div className="flex flex-col justify-center">
          <SectionLabel>{label}</SectionLabel>
          <h3
            className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl text-gray-900"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {title}
          </h3>
          <p className="mt-4 text-lg leading-relaxed text-gray-600">
            {body}
          </p>
          <a
            href="/#how-it-works"
            className="mt-6 inline-flex items-center gap-2 text-base font-semibold text-violet-600 transition-all hover:gap-3"
          >
            Learn more
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </FadeUp>
      <FadeUp delay={index * 0.05 + 0.1}>{mockup}</FadeUp>
    </div>
  );
}
