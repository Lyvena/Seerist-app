"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

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
    return { color: "#6B7280", background: "#F3F4F6" };
  };

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-lg" style={{ boxShadow: "0 12px 48px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)", padding: "24px", position: "relative", overflow: "hidden" }}>
      <div
        aria-hidden="true"
        style={{
          content: '',
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.04) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          pointerEvents: "none",
        }}
      />
      <div>
        <div className="border-b border-[#E5E7EB] px-3.5 py-3.5">
          <p className="text-[0.8125rem] font-semibold text-[#111827]">From: Seerist &lt;notifications@seerist.xyz&gt;</p>
          <p className="mt-1 text-[0.8125rem] font-semibold text-[#374151]">Subject: 🎯 Your Daily Digest · 9 new opportunities</p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={step === "body" || step === "done" ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-2 px-1"
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
                className="rounded-md border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-2.5 flex justify-between items-center"
              >
                <div>
                  <p className="text-[0.75rem] font-medium text-[#111827]">{op.title}</p>
                  <p className="text-[0.6875rem] text-[#9CA3AF]">{op.platform} · {op.budget}</p>
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
            className="inline-flex h-8 w-full items-center justify-center rounded-md bg-violet-600 px-4 py-2.5 text-[0.8125rem] font-semibold text-white transition hover:bg-violet-700 mt-3"
          >
            Generate Proposals →
          </motion.button>
        )}
      </div>
    </div>
  );
}
