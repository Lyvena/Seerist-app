"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FadeUp } from "@/components/animations/FadeUp";
import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import { ArrowRight, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Plan {
  name: string;
  slug: string;
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
    slug: "free",
    monthly: 0,
    annual: 0,
    subtitle: "For founders just getting started.",
    href: "/signup",
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
    slug: "pro",
    monthly: 29,
    annual: 19,
    subtitle: "For serious indie founders.",
    href: "/signup?plan=pro",
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
    slug: "agency",
    monthly: 79,
    annual: 55,
    subtitle: "For studios and prolific builders.",
    href: "/signup?agency=agency",
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
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full mt-0.5"
        style={{
          background: included ? "#EEEDFF" : "#F4F6FB",
          color: included ? "#635BFF" : "#D1D5DB",
          fontSize: "0.625rem",
          fontWeight: 800,
        }}
      >
        {included ? "✓" : "✗"}
      </div>
      <span className="text-[0.9375rem]" style={{ color: included ? "#2D3754" : "#94A0BC" }}>
        {text}
      </span>
    </div>
  );
}

function PlanCard({ plan, annual, isMobile }: { plan: Plan; annual: boolean; isMobile: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isPro = plan.popular;

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.slug, annual }),
      });
      const data = await res.json();
      if (data.redirectUrl) {
        router.push(data.redirectUrl);
      } else {
        toast.error(data.error || "Checkout failed");
      }
    } catch {
      toast.error("Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

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
      className="relative flex flex-col rounded-2xl border bg-white"
      style={{
        borderWidth: isPro ? "2px" : "1px",
        borderColor: isPro ? "#635BFF" : "#EBEEF5",
        padding: "32px",
        boxShadow: isPro && !isMobile
          ? "0 20px 60px rgba(99,91,255,0.12), 0 4px 16px rgba(99,91,255,0.06)"
          : "var(--shadow-md)",
        transform: isPro && !isMobile ? "scale(1.02) translateY(-4px)" : "none",
      }}
      whileHover={isPro && !isMobile ? { scale: 1.03, y: -6 } : { y: -2 }}
    >
      {isPro && (
        <div
          className="absolute -top-3.5 left-1/2 -translate-x-1/2"
          style={{
            background: "linear-gradient(135deg, #635BFF, #8B5CF6)",
            color: "white",
            borderRadius: "999px",
            padding: "5px 18px",
            fontSize: "0.75rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 16px rgba(99,91,255,0.3)",
          }}
        >
          Most Popular
        </div>
      )}

      <div>
        <h3
          className="text-[0.8125rem] font-semibold uppercase tracking-wider"
          style={{ color: isPro ? "#635BFF" : "#94A0BC", marginBottom: "8px" }}
        >
          {plan.name}
        </h3>
        <div className="flex items-baseline gap-1">
          <span
            className="font-bold"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(2.5rem, 4vw, 3.25rem)",
              letterSpacing: "-0.03em",
              color: isPro ? "#635BFF" : "#0B1221",
              lineHeight: 1,
            }}
          >
            ${annual ? plan.annual : plan.monthly}
          </span>
          {(annual ? plan.annual : plan.monthly) > 0 && (
            <span className="text-[0.9375rem] text-[#94A0BC] font-normal">/month</span>
          )}
        </div>
        <p className="text-[0.9375rem] text-[#5E6B8A] mt-2 mb-6" style={{ lineHeight: 1.5 }}>
          {plan.subtitle}
        </p>
      </div>

      {plan.slug === "free" ? (
        <Link
          href={plan.href}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[0.9375rem] font-semibold transition-all"
          style={{
            background: "white",
            color: "#2D3754",
            border: "1.5px solid #EBEEF5",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#C7C3FF";
            e.currentTarget.style.background = "#EEEDFF";
            e.currentTarget.style.color = "#635BFF";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#EBEEF5";
            e.currentTarget.style.background = "white";
            e.currentTarget.style.color = "#2D3754";
          }}
        >
          Get Started Free
          <ArrowRight className="w-4 h-4" />
        </Link>
      ) : (
        <button
          onClick={handleCheckout}
          disabled={loading}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[0.9375rem] font-semibold transition-all"
          style={{
            background: isPro ? "linear-gradient(135deg, #635BFF, #8B5CF6)" : "white",
            color: isPro ? "white" : "#2D3754",
            border: isPro ? "none" : "1.5px solid #EBEEF5",
            boxShadow: isPro ? "0 4px 16px rgba(99,91,255,0.2)" : "none",
          }}
          onMouseEnter={(e) => {
            if (isPro) {
              e.currentTarget.style.boxShadow = "0 8px 28px rgba(99,91,255,0.3)";
            } else {
              e.currentTarget.style.borderColor = "#C7C3FF";
              e.currentTarget.style.background = "#EEEDFF";
              e.currentTarget.style.color = "#635BFF";
            }
          }}
          onMouseLeave={(e) => {
            if (isPro) {
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(99,91,255,0.2)";
            } else {
              e.currentTarget.style.borderColor = "#EBEEF5";
              e.currentTarget.style.background = "white";
              e.currentTarget.style.color = "#2D3754";
            }
          }}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {plan.name === "Pro" ? "Start Pro" : "Start Agency"}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      )}

      <div className="my-6 w-full border-t border-[#EBEEF5]" />

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
    <section className="pt-8">
      <div
        className="grid grid-cols-1 gap-5 sm:grid-cols-1 lg:grid-cols-3"
        style={{
          alignItems: "start",
          maxWidth: "1040px",
          marginInline: "auto",
          marginTop: "48px",
        }}
      >
        {PLANS.map((plan, index) => (
          <FadeUp key={plan.name} delay={index * 0.1}>
            <PlanCard plan={plan} annual={annual} isMobile={false} />
          </FadeUp>
        ))}
      </div>

      <FadeUp delay={0.4}>
        <div
          className="inline-flex items-center gap-2 mx-auto flex"
          style={{
            background: "#E0FAF6",
            border: "1px solid #A7F3D0",
            borderRadius: "999px",
            padding: "10px 20px",
            marginTop: "28px",
          }}
        >
          <Shield style={{ color: "#059669", height: "16px", width: "16px" }} />
          <span className="text-[0.875rem] font-medium" style={{ color: "#065F46" }}>
            14-day money-back guarantee · Cancel any time
          </span>
        </div>
      </FadeUp>
    </section>
  );
}
