"use client";
import { Container } from "@/components/ui/Container";
import { FadeUp } from "@/components/animations/FadeUp";
import { Package, Globe, Zap, ArrowRight } from "lucide-react";

type StepKey = "describe" | "platforms" | "proposal";

interface Step {
  key: StepKey;
  number: string;
  title: string;
  body: string;
  icon: typeof Package;
  gradient: string;
}

const STEPS: Step[] = [
  {
    key: "describe",
    number: "01",
    title: "Describe what you've built",
    body: "Paste in your product name, description, and ideal customer. Seerist learns your product deeply — so it knows exactly which job posts are a genuine fit.",
    icon: Package,
    gradient: "from-[#635BFF] to-[#8B5CF6]",
  },
  {
    key: "platforms",
    number: "02",
    title: "Pick platforms to monitor",
    body: "Select from 14 freelance and remote job platforms. Set a minimum match score. Enable auto-propose for hands-free sales.",
    icon: Globe,
    gradient: "from-[#8B5CF6] to-[#A78BFA]",
  },
  {
    key: "proposal",
    number: "03",
    title: "AI finds matches and writes pitches",
    body: "When Seerist finds a buyer who needs what you built, it scores the opportunity and generates a tailored proposal — ready to send.",
    icon: Zap,
    gradient: "from-[#00C2A8] to-[#059669]",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(99,91,255,0.03) 0%, transparent 70%)",
          }}
        />
      </div>

      <Container>
        <div className="text-center mb-16">
          <FadeUp>
            <p className="section-label mb-4">How it works</p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2
              className="tracking-tight text-[#0B1221]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Three steps. Then it runs itself.
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto mt-4 max-w-[520px] text-[1.0625rem] text-[#5E6B8A]">
              Set it up once. Seerist runs automatically, day and night.
            </p>
          </FadeUp>
        </div>

        <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-3 max-w-[1000px] mx-auto">
          {/* Connector line */}
          <div
            className="absolute top-[60px] left-[calc(33%+24px)] right-[calc(33%+24px)] z-0 hidden lg:block"
            style={{
              height: "2px",
              background: "linear-gradient(90deg, #C7C3FF, #635BFF, #00C2A8)",
            }}
          />

          {STEPS.map((step, index) => (
            <StepCard key={step.key} step={step} index={index} />
          ))}
        </div>

        <FadeUp delay={0.4}>
          <div className="mt-12 text-center">
            <a
              href="https://app.seerist.xyz/signup"
              className="inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-[#635BFF] hover:text-[#5046E5] transition-colors"
            >
              Start with the free plan
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </FadeUp>
      </Container>
    </section>
  );
}

function StepCard({ step, index }: { step: Step; index: number }) {
  const Icon = step.icon;
  return (
    <FadeUp delay={0.2 + index * 0.1}>
      <div
        className="relative flex flex-col rounded-2xl border border-[#EBEEF5] bg-white p-7 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
        style={{ boxShadow: "var(--shadow-md)", zIndex: 1 }}
      >
        {/* Step number */}
        <div
          className="flex h-12 w-12 items-center justify-center rounded-2xl mx-auto mb-5"
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

        {/* Icon */}
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl mx-auto mb-4"
          style={{
            background: "#EEEDFF",
            color: "#635BFF",
          }}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>

        <h3
          className="font-bold text-[#0B1221] mb-3"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.125rem",
          }}
        >
          {step.title}
        </h3>

        <p className="text-[0.9375rem] leading-relaxed text-[#5E6B8A]">
          {step.body}
        </p>
      </div>
    </FadeUp>
  );
}
