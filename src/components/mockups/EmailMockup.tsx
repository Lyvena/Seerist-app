"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const OPPORTUNITIES = [
  {
    title: "Need invoicing tool for my freelance agency",
    platform: "Upwork",
    score: 94,
    budget: "$200–$400",
    category: "SaaS Tools",
  },
  {
    title: "Looking for project management software for remote team",
    platform: "Contra",
    score: 87,
    budget: "$100–$250",
    category: "SaaS Tools",
  },
  {
    title: "Automation tool for client onboarding needed",
    platform: "Remote OK",
    score: 72,
    budget: "$50/mo SaaS",
    category: "Plugins",
  },
];

export function EmailMockup() {
  const [step, setStep] = useState<"header" | "body" | "done">("header");
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const headers = window.setTimeout(() => setStep("body"), 800);
    const body = window.setTimeout(() => setStep("done"), 2200);
    return () => {
      window.clearTimeout(headers);
      window.clearTimeout(body);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
      <div className="space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <p className="text-sm font-semibold text-gray-900">From: Seerist &lt;notifications@seerist.xyz&gt;</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">
            Subject: 🎯 Your Daily Digest · 9 new opportunities
          </p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={step === "body" || step === "done" ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-3"
        >
          {OPPORTUNITIES.map((op, index) => (
            <motion.div
              key={op.title}
              initial={{ opacity: 0, x: -8 }}
              animate={
                step === "done"
                  ? { opacity: 1, x: 0 }
                  : step === "body"
                  ? { opacity: index === 0 ? 1 : 0.4, x: index === 0 ? 0 : -8 }
                  : {}
              }
              transition={{ delay: index * 0.1, duration: 0.4 }}
              className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{op.title}</p>
                  <p className="text-xs text-gray-500">
                    {op.platform} · {op.budget}
                  </p>
                </div>
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                  {op.score}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
        {step === "done" && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            Generate Proposals →
          </motion.button>
        )}
      </div>
    </div>
  );
}
