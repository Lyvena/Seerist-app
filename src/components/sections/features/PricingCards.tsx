"use client";
import { useState } from "react";
import Link from "next/link";
import { FadeUp } from "@/components/animations/FadeUp";
import { Badge } from "@/components/ui/badge";

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
    href: "https://app.seerist.xyz/signup?plan=agency",
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

function PlanPrice({ plan, annual }: { plan: Plan; annual: boolean }) {
  const price = annual ? plan.annual : plan.monthly;
  return (
    <div className="mt-6 flex items-baseline gap-1">
      <span className="text-5xl font-semibold text-gray-900" style={{ fontFamily: "var(--font-heading)" }}>
        ${price}
      </span>
      {price > 0 && <span className="text-sm text-gray-600">{annual ? "/mo" : "/month"}</span>}
    </div>
  );
}

export function PricingCards({ annual }: { annual: boolean }) {
  return (
    <section className="bg-white py-20">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {PLANS.map((plan, index) => (
            <FadeUp key={plan.name} delay={index * 0.1}>
              <div
                className={`relative flex flex-col rounded-3xl border bg-white p-8 ${
                  plan.popular
                    ? "bg-gradient-to-br from-violet-50 to-white"
                    : "border-gray-200"
                }`}
                style={{ boxShadow: plan.popular ? "0 16px 48px rgba(124, 58, 237, 0.2)" : "0 1px 3px rgba(0,0,0,0.06)" }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="rounded-full bg-violet-600 px-4 py-1 text-xs font-semibold text-white">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <h3 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: "var(--font-heading)" }}>
                  {plan.name}
                </h3>
                <PlanPrice plan={plan} annual={annual} />
                <p className="mt-2 text-sm text-gray-600">{plan.subtitle}</p>
                <Link
                  href={plan.href}
                  className={`mt-6 inline-flex h-12 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    plan.popular
                      ? "bg-violet-600 text-white hover:bg-violet-700"
                      : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {plan.name === "Free" ? "Get Started Free" : plan.name === "Pro" ? "Start Pro — 7 Days Free" : "Start Agency"}
                </Link>
                <div className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-sm text-gray-700">
                      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-600" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{feature}</span>
                    </div>
                  ))}
                  {plan.missing.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-sm text-gray-400">
                      <svg className="mt-0.5 h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
