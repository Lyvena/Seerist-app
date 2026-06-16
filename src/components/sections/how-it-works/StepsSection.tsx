"use client";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { OnboardingMockup } from "@/components/mockups/OnboardingMockup";
import { PlatformPickerMockup } from "@/components/mockups/PlatformPickerMockup";
import { ProposalMockup } from "@/components/mockups/ProposalMockup";
import { ScoringMockup } from "@/components/mockups/ScoringMockup";
import { LiveFeedMockup } from "@/components/mockups/LiveFeedMockup";
import { PipelineMockup } from "@/components/mockups/PipelineMockup";
import type { ReactNode } from "react";

const STEPS = [
  {
    number: "01",
    title: "Create your account",
    body:
      "Sign up in 30 seconds. No credit card required. Just your email and a password — you're in.",
    mockup: null,
    tip: "Pro tip: Use the same email as your freelance platform accounts to keep everything in one place.",
  },
  {
    number: "02",
    title: "Describe your product",
    body:
      "Paste your product name, a short description, and ideal customer. Seerist learns your product deeply so it knows which job posts are genuine fits.",
    mockup: <OnboardingMockup />,
    tip: "Pro tip: The more specific you are, the better Seerist scores opportunities. Add 3–5 keywords that define your ideal buyer.",
  },
  {
    number: "03",
    title: "Choose platforms",
    body:
      "Select from 14 freelance and remote job platforms. Pick all of them or start with just a few — you can change anytime.",
    mockup: <PlatformPickerMockup />,
    tip: "Pro tip: Upwork, Freelancer, and Contra have the highest volume for SaaS products. Start there and expand as you grow.",
  },
  {
    number: "04",
    title: "Set your match criteria",
    body:
      "Set a minimum match score (default: 70). Add budget filters, exclude keywords, and choose which deal types to prioritize.",
    mockup: <ScoringMockup />,
    tip: "Pro tip: A score of 70+ filters out noise while keeping enough opportunities to review daily.",
  },
  {
    number: "05",
    title: "Let Seerist monitor and score",
    body:
      "Seerist scans all your chosen platforms 24/7. New posts are scored, ranked, and added to your live feed automatically.",
    mockup: <LiveFeedMockup />,
    tip: "Pro tip: Enable desktop notifications for high-score matches so you can jump on new opportunities immediately.",
  },
  {
    number: "06",
    title: "Review matches and send proposals",
    body:
      "Each morning your inbox is your pipeline. Review top matches, tweak AI proposals, and hit send. The rest is handled automatically.",
    mockup: <ProposalMockup />,
    tip: "Pro tip: Use the Auto-propose feature to send proposals instantly — Seerist's AI writes them in your brand voice.",
  },
];

export function StepsSection() {
  return (
    <section className="py-24">
      <Container>
        <div className="mb-16 text-center">
          <SectionLabel>The Process</SectionLabel>
          <h1
            className="mt-4 font-semibold tracking-tight md:text-5xl"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(40px, 6vw, 72px)",
              color: "var(--color-text-1)",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            From setup to first deal — in six steps.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg" style={{ color: "var(--color-text-3)" }}>
            Set it up once. Seerist runs automatically, day and night.
          </p>
        </div>

        <div className="space-y-20">
          {STEPS.map((step, index) => (
            <StepBlock key={step.number} step={step} index={index} />
          ))}
        </div>
      </Container>
    </section>
  );
}

type StepBlockProps = {
  step: (typeof STEPS)[number];
  index: number;
};

function StepBlock({ step, index }: StepBlockProps) {
  const isEven = index % 2 === 0;
  return (
    <div
      className={`grid grid-cols-1 gap-10 lg:grid-cols-2 ${
        !isEven ? "lg:[&>*:first-child]:order-2" : ""
      }`}
    >
      <FadeUp delay={index * 0.05}>
        <div className="flex flex-col justify-center">
          <span
            className="text-sm font-semibold uppercase tracking-widest text-violet-700"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Step {step.number}
          </span>
          <h3
            className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-text-1)" }}
          >
            {step.title}
          </h3>
          <p className="mt-4 text-lg leading-relaxed" style={{ color: "var(--color-text-2)" }}>
            {step.body}
          </p>
          <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50/80 p-4 text-sm text-violet-900">
            {step.tip}
          </div>
        </div>
      </FadeUp>
      <FadeUp delay={index * 0.05 + 0.1}>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-sm">
          {step.mockup ?? <PlaceholderMockup label={`Step ${step.number} preview`} />}
        </div>
      </FadeUp>
    </div>
  );
}

function PlaceholderMockup({ label }: { label: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-200 text-sm text-gray-400">
      {label}
    </div>
  );
}
