"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { FadeUp } from "@/components/animations/FadeUp";
import { OnboardingMockup } from "@/components/mockups/OnboardingMockup";
import { PlatformPickerMockup } from "@/components/mockups/PlatformPickerMockup";
import { ProposalMockup } from "@/components/mockups/ProposalMockup";
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
    body: "Paste in your product name, description, and ideal customer. Seerist learns your product deeply — so it knows exactly which job posts are a genuine fit, and which to ignore.",
    icon: Package,
    accent: "#7C3AED",
  },
  {
    key: "platforms",
    number: "02",
    title: "Pick the platforms to monitor",
    body: "Select from 14 freelance and remote job platforms. Set a minimum match score. Enable auto-propose if you want proposals sent with zero manual intervention.",
    icon: Globe,
    accent: "#7C3AED",
  },
  {
    key: "proposal",
    number: "03",
    title: "AI finds matches and writes your pitches",
    body: "When Seerist finds a buyer who needs what you built, it scores the opportunity and generates a tailored proposal — ready to send in one click. Your pipeline updates automatically.",
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
    <section id="how-it-works" ref={sectionRef} className="py-24">
      <Container>
        <div className="mb-16 text-center">
          <FadeUp>
            <SectionLabel>The Process</SectionLabel>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2
              className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl"
              style={{ fontFamily: "var(--font-heading)", color: "var(--color-text-1)" }}
            >
              From product description to closed deal — in three steps
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto mt-3 max-w-2xl text-base" style={{ color: "var(--color-text-3)" }}>
              Set it up once. Seerist runs automatically, day and night.
            </p>
          </FadeUp>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            {STEPS.map(({ key, number, title, body, icon: Icon, accent }) => {
              const isActive = active === key;
              return (
                <div
                  key={key}
                  data-step={key}
                  className={`rounded-2xl border bg-white p-6 transition-all duration-300 md:p-8 ${
                    isActive ? "border-violet-200 shadow-sm" : "border-gray-100"
                  }`}
                  style={{ borderLeftWidth: 4, borderLeftColor: isActive ? accent : "var(--color-border)" }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl transition-colors duration-300 ${
                        isActive ? "bg-violet-600 text-white" : "bg-gray-50 text-gray-500"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-2xl font-semibold transition-all duration-300 ${
                            isActive ? "text-violet-700" : "text-gray-300"
                          }`}
                          style={{ fontFamily: "var(--font-heading)" }}
                        >
                          {number}
                        </span>
                        <h3 className="text-base font-semibold text-gray-900 md:text-lg">{title}</h3>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600">{body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-24">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                {active === "describe" && <OnboardingMockup />}
                {active === "platforms" && <PlatformPickerMockup />}
                {active === "proposal" && <ProposalMockup />}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Mobile mockups */}
        <div className="mt-10 space-y-6 lg:hidden">
          <OnboardingMockup />
          <PlatformPickerMockup />
          <ProposalMockup />
        </div>
      </Container>
    </section>
  );
}

