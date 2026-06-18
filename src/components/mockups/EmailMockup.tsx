"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const OPPORTUNITIES = [
  {
    title: "Need invoicing tool for my freelance agency",
    platform: "Upwork",
    score: 94,
    budget: "$200–$400",
  },
  {
    title: "Looking for project management software for remote team",
    platform: "Contra",
    score: 87,
    budget: "$100–$250",
  },
  {
    title: "Automation tool for client onboarding needed",
    platform: "Remote OK",
    score: 72,
    budget: "$50/mo SaaS",
  },
];

export function EmailMockup() {
  const [step, setStep] = useState<"header" | "body" | "done">("header");

  useEffect(() => {
    const headers = window.setTimeout(() => setStep("body"), 800);
    const body = window.setTimeout(() => setStep("done"), 2200);
    return () => {
      window.clearTimeout(headers);
      window.clearTimeout(body);
    };
  }, []);

  const getScoreStyles = (score: number) => {
    if (score >= 80) return { color: "#059669", background: "#ECFDF5" };
    if (score >= 60) return { color: "#2563EB", background: "#EFF6FF" };
    return { color: "#5E6B8A", background: "#F4F6FB" };
  };

  return (
    <div
      className="rounded-2xl border border-[#EBEEF5] bg-white"
      style={{ boxShadow: "var(--shadow-xl)", padding: "28px", position: "relative", overflow: "hidden" }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(99,91,255,0.03) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      <div className="relative">
        <div className="border-b border-[#EBEEF5] px-2 pb-3 mb-3">
          <p className="text-[0.8125rem] font-semibold text-[#0B1221]">From: Seerist &lt;notifications@seerist.xyz&gt;</p>
          <p className="mt-1 text-[0.8125rem] font-semibold text-[#2D3754]">Subject: 🎯 Your Daily Digest · 9 new opportunities</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={step === "body" || step === "done" ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-2"
        >
          {OPPORTUNITIES.map((op, index) => {
            const scoreStyles = getScoreStyles(op.score);
            return (
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
                className="rounded-xl border border-[#EBEEF5] bg-[#F4F6FB] px-3 py-2.5 flex justify-between items-center"
              >
                <div>
                  <p className="text-[0.8125rem] font-medium text-[#0B1221]">{op.title}</p>
                  <p className="text-[0.6875rem] text-[#94A0BC]">{op.platform} · {op.budget}</p>
                </div>
                <span
                  className="rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold"
                  style={{ color: scoreStyles.color, background: scoreStyles.background }}
                >
                  {op.score}
                </span>
              </motion.div>
            );
          })}
        </motion.div>

        {step === "done" && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex h-9 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#635BFF] to-[#8B5CF6] px-4 text-[0.875rem] font-semibold text-white transition hover:opacity-90 mt-3"
          >
            Generate Proposals →
          </motion.button>
        )}
      </div>
    </div>
  );
}
