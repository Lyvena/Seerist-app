"use client";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { OnboardingMockup } from "@/components/mockups/OnboardingMockup";
import { LiveFeedMockup } from "@/components/mockups/LiveFeedMockup";
import { PipelineMockup } from "@/components/mockups/PipelineMockup";
import { motion } from "framer-motion";
import { Package, Globe, Zap } from "lucide-react";

const STEPS = [
  {
    number: "01",
    title: "Describe your product",
    body:
      "Paste your product name, a short description, and ideal customer. Seerist learns your product deeply so it knows which job posts are genuine fits.",
    icon: Package,
    mockup: <OnboardingMockup />,
  },
  {
    number: "02",
    title: "Monitor and score",
    body:
      "Seerist scans all your chosen platforms 24/7. New posts are scored, ranked, and added to your live feed automatically.",
    icon: Globe,
    mockup: <LiveFeedMockup />,
  },
  {
    number: "03",
    title: "Close the deal",
    body:
      "Review top matches, tweak AI proposals, and hit send. Track responses in the pipeline and watch deals close automatically.",
    icon: Zap,
    mockup: <PipelineMockup />,
  },
];

export function StepsSection() {
  return (
    <section className="bg-white py-24">
      <Container>
        <div className="mb-16 text-center">
          <FadeUp>
            <SectionLabel>The Process</SectionLabel>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2
              className="tracking-tight"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(2rem, 4vw, 3.25rem)",
                color: "#111827",
              }}
            >
              From product description to closed deal — in three steps
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p
              className="mx-auto mt-3 max-w-2xl text-[1.0625rem] text-[#6B7280]"
            >
              Set it up once. Seerist runs automatically, day and night.
            </p>
          </FadeUp>
        </div>

        <div
          className="relative grid grid-cols-1 gap-8 lg:grid-cols-3"
          style={{
            gap: "32px",
            marginTop: "64px",
          }}
        >
          {/* Connector line */}
          <div
            className="absolute top-[40px] left-[calc(33%+32px)] right-[calc(33%+32px)] z-0 hidden lg:block"
            style={{
              height: "1px",
              background: "linear-gradient(90deg, #C4B5FD, #7C3AED, #C4B5FD)",
            }}
          />

          {STEPS.map((step, index) => (
            <FadeUp key={step.number} delay={0.3 + index * 0.1}>
              <StepCard step={step} />
            </FadeUp>
          ))}
        </div>
      </Container>
    </section>
  );
}

function StepCard({ step }: { step: typeof STEPS[number] }) {
  const Icon = step.icon;
  return (
    <motion.div
      whileHover={{
        y: -4,
        boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
      }}
      className="relative flex flex-col rounded-[20px] border bg-white transition-all"
      style={{
        background: "white",
        border: "1px solid #F3F4F6",
        padding: "32px",
        textAlign: "center",
        zIndex: 1,
      }}
    >
      {/* Step number circle */}
      <div
        className="flex h-[52px] w-[52px] items-center justify-center rounded-full"
        style={{
          background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
          color: "white",
          fontSize: "1.125rem",
          fontWeight: 800,
          margin: "0 auto 20px",
          boxShadow: "0 8px 20px rgba(124,58,237,0.3)",
        }}
      >
        {step.number}
      </div>

      {/* Step icon */}
      <div
        className="flex h-[40px] w-[40px] items-center justify-center rounded-[10px]"
        style={{
          background: "#EDE9FE",
          margin: "0 auto 16px",
          color: "#7C3AED",
        }}
      >
        <Icon className="h-5 w-5" />
      </div>

      {/* Step title */}
      <h3
        className="font-bold"
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: "1.25rem",
          color: "#0A0A0A",
          marginBottom: "12px",
        }}
      >
        {step.title}
      </h3>

      {/* Step body */}
      <p
        className="text-[0.9375rem] leading-relaxed"
        style={{ color: "#6B7280" }}
      >
        {step.body}
      </p>

      {/* Mockup */}
      <div className="mt-6">{step.mockup}</div>
    </motion.div>
  );
}