"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { FadeUp } from "@/components/animations/FadeUp";
import { OnboardingMockup } from "@/components/mockups/OnboardingMockup";
import { LiveFeedMockup } from "@/components/mockups/LiveFeedMockup";
import { PipelineMockup } from "@/components/mockups/PipelineMockup";
import { Package, Globe, Zap } from "lucide-react";

type StepKey = "describe" | "platforms" | "proposal";

interface Step {
  key: StepKey;
  number: string;
  title: string;
  body: string;
  icon: typeof Package;
  accent: string;
}

const STEPS: Step[] = [
  {
    key: "describe",
    number: "01",
    title: "Tell Seerist what you've built",
    body: "Paste in your product name, description, and ideal customer. Seerist learns your product deeply — so it knows exactly which job posts are a genuine fit.",
    icon: Package,
    accent: "#7C3AED",
  },
  {
    key: "platforms",
    number: "02",
    title: "Pick platforms to monitor",
    body: "Select from 14 freelance and remote job platforms. Set a minimum match score. Enable auto-propose for hands-free sales.",
    icon: Globe,
    accent: "#7C3AED",
  },
  {
    key: "proposal",
    number: "03",
    title: "AI finds matches and writes pitches",
    body: "When Seerist finds a buyer who needs what you built, it scores the opportunity and generates a tailored proposal — ready to send.",
    icon: Zap,
    accent: "#7C3AED",
  },
];

export function HowItWorks() {
  const [active, setActive] = useState<StepKey>("describe");
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const cards = section.querySelectorAll("[data-step]");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const key = (entry.target as HTMLElement).getAttribute("data-step") as StepKey | null;
          if (!key) return;
          if (entry.isIntersecting) setActive(key);
        });
      },
      {
        rootMargin: "-30% 0px -40% 0px",
        threshold: 0,
      }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="bg-white py-24 lg:bg-white"
    >
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

        <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-3" style={{ marginTop: "64px", gap: "32px" }}>
          {/* Connector lines */}
          <div
            className="absolute top-[40px] left-[calc(33%+32px)] right-[calc(33%+32px)] z-0 hidden lg:block"
            style={{
              height: "1px",
              background: "linear-gradient(90deg, #C4B5FD, #7C3AED, #C4B5FD)",
            }}
          />

          {STEPS.map((step, index) => (
            <StepCard key={step.key} step={step} index={index} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function StepCard({ step }: { step: Step; index: number }) {
  const Icon = step.icon;
  return (
    <FadeUp delay={0.3}>
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
      </motion.div>
    </FadeUp>
  );
}