"use client";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";
import { OnboardingMockup } from "@/components/mockups/OnboardingMockup";
import { LiveFeedMockup } from "@/components/mockups/LiveFeedMockup";
import { PipelineMockup } from "@/components/mockups/PipelineMockup";
import { motion } from "framer-motion";
import { Package, Globe, Zap } from "lucide-react";

const STEPS = [
  {
    number: "01",
    title: "Describe your product",
    body: "Paste your product name, a short description, and ideal customer. Seerist learns your product deeply so it knows which job posts are genuine fits.",
    icon: Package,
    mockup: <OnboardingMockup />,
    gradient: "from-[#635BFF] to-[#8B5CF6]",
  },
  {
    number: "02",
    title: "Monitor and score",
    body: "Seerist scans all your chosen platforms 24/7. New posts are scored, ranked, and added to your live feed automatically.",
    icon: Globe,
    mockup: <LiveFeedMockup />,
    gradient: "from-[#8B5CF6] to-[#A78BFA]",
  },
  {
    number: "03",
    title: "Close the deal",
    body: "Review top matches, tweak AI proposals, and hit send. Track responses in the pipeline and watch deals close automatically.",
    icon: Zap,
    mockup: <PipelineMockup />,
    gradient: "from-[#00C2A8] to-[#059669]",
  },
];

export function StepsSection() {
  return (
    <section className="bg-[#FAFBFE]">
      <Container>
        <div className="mb-16 text-center">
          <FadeUp>
            <p className="section-label mb-4">How It Works</p>
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
              From product description to closed deal
            </h1>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto mt-4 max-w-[520px] text-[1.0625rem] text-[#5E6B8A]">
              Set it up once. Seerist runs automatically, day and night.
            </p>
          </FadeUp>
        </div>

        <div
          className="relative grid grid-cols-1 gap-6 lg:grid-cols-3"
          style={{ marginTop: "56px" }}
        >
          <div
            className="absolute top-[60px] left-[calc(33%+24px)] right-[calc(33%+24px)] z-0 hidden lg:block"
            style={{
              height: "2px",
              background: "linear-gradient(90deg, #C7C3FF, #635BFF, #00C2A8)",
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
      whileHover={{ y: -4, boxShadow: "var(--shadow-lg)" }}
      className="relative flex flex-col rounded-2xl border border-[#EBEEF5] bg-white transition-all overflow-hidden"
      style={{ boxShadow: "var(--shadow-md)", zIndex: 1 }}
    >
      {/* Header gradient bar */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${step.gradient.split(" ")[1]}, ${step.gradient.split(" ")[3]})` }} />

      <div className="p-6 flex flex-col flex-1">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl mb-5"
          style={{
            background: `linear-gradient(135deg, ${step.gradient.split(" ")[1]}, ${step.gradient.split(" ")[3]})`,
            color: "white",
            fontSize: "1.125rem",
            fontWeight: 800,
            boxShadow: `0 4px 16px ${step.gradient.includes("635BFF") ? "rgba(99,91,255,0.2)" : step.gradient.includes("8B5CF6") ? "rgba(139,92,246,0.2)" : "rgba(0,194,168,0.2)"}`,
          }}
        >
          {step.number}
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl mb-4" style={{ background: "#EEEDFF", color: "#635BFF" }}>
          <Icon className="h-4.5 w-4.5" />
        </div>

        <h3
          className="font-bold text-[#0B1221] mb-3"
          style={{ fontFamily: "var(--font-heading)", fontSize: "1.125rem" }}
        >
          {step.title}
        </h3>

        <p className="text-[0.9375rem] leading-relaxed text-[#5E6B8A] flex-1">
          {step.body}
        </p>

        <div className="mt-5">{step.mockup}</div>
      </div>
    </motion.div>
  );
}
