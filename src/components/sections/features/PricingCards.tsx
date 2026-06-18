"use client";
import Link from "next/link";
import { FadeUp } from "@/components/animations/FadeUp";
import { motion } from "framer-motion";
import type { CSSProperties } from "react";

interface Plan {
  name: string;
  monthly: number;
  annual: number;
  subtitle: string;
  href: string;
  popular: boolean;
  features: string[];
  missing: string[];
}

const PLANS: Plan[] = [
  {
    name: "Free",
    monthly: 0,
    annual: 0,
    subtitle: "For founders just getting started.",
    href: "https://app.seerist.xyz/signup",
    popular: false,
    features: [
      "1 product",
      "5 platforms (your choice)",
      "100 opportunities per month",
      "20 AI proposals per month",
      "Basic email digest (daily)",
      "Pipeline tracker",
    ],
    missing: ["Auto-propose", "Analytics dashboard", "BYOK AI keys", "Multi-product"],
  },
  {
    name: "Pro",
    monthly: 29,
    annual: 19,
    subtitle: "For serious indie founders.",
    href: "https://app.seerist.xyz/signup?plan=pro",
    popular: true,
    features: [
      "Everything in Free",
      "3 products",
      "All 14 platforms",
      "Unlimited opportunities",
      "100 AI proposals/month",
      "Auto-propose (hands-free)",
      "Analytics dashboard",
      "BYOK AI keys",
      "Real-time email alerts",
      "Priority platform scanning",
    ],
    missing: [],
  },
  {
    name: "Agency",
    monthly: 79,
    annual: 55,
    subtitle: "For studios and prolific builders.",
    href: "https://app.seerist.xyz/signup?agency=agency",
    popular: false,
    features: [
      "Everything in Pro",
      "Unlimited products",
      "Unlimited AI proposals",
      "White-label proposal exports (PDF)",
      "API access (coming soon)",
      "Team seats (coming soon)",
      "Priority support (< 4h response)",
      "Custom platform integrations (on request)",
    ],
    missing: [],
  },
];

function FeatureItem({ text, included }: { text: string; included: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full"
        style={{
          background: included ? "#EDE9FE" : "#F3F4F6",
          color: included ? "#7C3AED" : "#D1D5DB",
          fontSize: "0.6875rem",
          fontWeight: 800,
        }}
      >
        {included ? "✓" : "✗"}
      </div>
      <span
        className="text-[0.9375rem]"
        style={{ color: included ? "#374151" : "#9CA3AF" }}
      >
        {text}
      </span>
    </div>
  );
}

function PlanCard({ plan, annual, isMobile }: { plan: Plan; annual: boolean; isMobile: boolean }) {
  const isPro = plan.popular;
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 24 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
        },
      }}
      className="relative flex flex-col rounded-[20px] border bg-white"
      style={{
        background: "white",
        borderWidth: isPro ? "2px" : "1px",
        borderColor: isPro ? "#7C3AED" : "#E5E7EB",
        padding: "32px",
        boxShadow: isPro && !isMobile
          ? "0 20px 60px rgba(124, 58, 237, 0.18), 0 4px 16px rgba(124, 58, 237, 0.10)"
          : "0 1px 3px rgba(0,0,0,0.06)",
        transform: isPro && !isMobile ? "scale(1.03) translateY(-8px)" : "none",
      }}
      whileHover={isPro && !isMobile ? { scale: 1.04, y: -10 } : undefined}
    >
      {isPro && (
        <div
          className="absolute -top-3.5 left-1/2 -translate-x-1/2"
          style={{
            background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
            color: "white",
            borderRadius: "999px",
            padding: "6px 20px",
            fontSize: "0.8125rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
          }}
        >
          Most Popular
        </div>
      )}

      <div>
        <h3
          className="text-[0.875rem] font-semibold uppercase"
          style={{
            letterSpacing: "0.06em",
            color: isPro ? "#7C3AED" : "#6B7280",
            marginBottom: "8px",
          }}
        >
          {plan.name}
        </h3>
        <div className="flex items-baseline gap-1">
          <span
            className="font-bold"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(2.5rem, 4vw, 3.5rem)",
              letterSpacing: "-0.03em",
              color: isPro ? "transparent" : "#0A0A0A",
              background: isPro ? "linear-gradient(135deg, #7C3AED, #6D28D9)" : "none",
              WebkitBackgroundClip: isPro ? "text" : "initial",
              backgroundClip: isPro ? "text" : "initial",
              lineHeight: 1,
            }}
          >
            ${annual ? plan.annual : plan.monthly}
          </span>
          {(annual ? plan.annual : plan.monthly) > 0 && (
            <span
              className="text-[1rem]"
              style={{ color: "#9CA3AF", fontWeight: 400 }}
            >
              /month
            </span>
          )}
        </div>
        <p
          className="text-[0.9375rem]"
          style={{
            color: "#6B7280",
            marginTop: "8px",
            marginBottom: "24px",
            lineHeight: 1.5,
          }}
        >
          {plan.subtitle}
        </p>
      </div>

      <Link
        href={plan.href}
        className="inline-flex h-12 w-full items-center justify-center rounded-[10px] text-[0.9375rem] font-semibold transition-all"
        style={{
          background: isPro ? "linear-gradient(135deg, #7C3AED, #6D28D9)" : "white",
          color: isPro ? "white" : "#374151",
          border: isPro ? "none" : "1.5px solid #D1D5DB",
          boxShadow: isPro ? "0 8px 24px rgba(124, 58, 237, 0.3)" : "none",
        }}
        onMouseEnter={(e) => {
          if (isPro) {
            e.currentTarget.style.boxShadow = "0 12px 32px rgba(124, 58, 237, 0.4)";
          } else {
            e.currentTarget.style.borderColor = "#9CA3AF";
            e.currentTarget.style.background = "#F9FAFB";
          }
        }}
        onMouseLeave={(e) => {
          if (isPro) {
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(124, 58, 237, 0.3)";
          } else {
            e.currentTarget.style.borderColor = "#D1D5DB";
            e.currentTarget.style.background = "white";
          }
        }}
      >
        {plan.name === "Free"
          ? "Get Started Free"
          : plan.name === "Pro"
          ? "Start Pro — 7 Days Free"
          : "Start Agency"}
      </Link>

      <div
        className="my-6 w-full border-t"
        style={{ borderColor: "#F3F4F6" }}
      />

      <div className="flex flex-col gap-2.5">
        {plan.features.map((feature) => (
          <FeatureItem key={feature} text={feature} included={true} />
        ))}
        {plan.missing.map((feature) => (
          <FeatureItem key={feature} text={feature} included={false} />
        ))}
      </div>
    </motion.div>
  );
}

export function PricingCards({ annual }: { annual: boolean }) {
  return (
    <section className="bg-white pt-24">
      <div
        className="grid grid-cols-1 gap-6 sm:grid-cols-1 lg:grid-cols-3"
        style={{
          gap: "24px",
          alignItems: "start",
          maxWidth: "1100px",
          marginInline: "auto",
          marginTop: "56px",
          paddingInline: "clamp(20px, 5vw, 80px)",
        }}
      >
        {PLANS.map((plan, index) => (
          <FadeUp key={plan.name} delay={index * 0.1}>
            <PlanCard plan={plan} annual={annual} isMobile={false} />
          </FadeUp>
        ))}
      </div>

      {/* Money-back guarantee */}
      <FadeUp delay={0.4}>
        <div
          className="inline-flex items-center gap-2"
          style={{
            background: "#ECFDF5",
            border: "1px solid #A7F3D0",
            borderRadius: "999px",
            padding: "10px 20px",
            marginTop: "32px",
            marginInline: "auto",
          }}
        >
          <Shield style={{ color: "#059669", height: "16px", width: "16px" }} />
          <span
            className="text-[0.875rem] font-medium"
            style={{ color: "#065F46" }}
          >
            14-day money-back guarantee · Cancel any time
          </span>
        </div>
      </FadeUp>
    </section>
  );
}

function Shield({ style }: { style?: CSSProperties }) {
  return (
    <svg
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}