"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const PLATFORM_COLORS: Record<string, string> = {
  Upwork: "#14A800",
  Contra: "#111827",
  RemoteOK: "#000000",
  "We Work Remotely": "#A742B1",
};

const OPPORTUNITIES = [
  { title: "Need invoicing tool for my freelance agency", platform: "Upwork", score: 94, budget: "$200–$400" },
  { title: "Looking for project management software for remote team", platform: "Contra", score: 87, budget: "$100–$250" },
  { title: "Automation tool for client onboarding needed", platform: "Remote OK", score: 72, budget: "$50/mo SaaS" },
];

export function LiveFeedMockup() {
  const [activePlatform, setActivePlatform] = useState(0);
  const [ready, setReady] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 120);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const interval = window.setInterval(() => {
      setActivePlatform((prev) => (prev + 1) % Object.keys(PLATFORM_COLORS).length);
    }, 3000);
    return () => window.clearInterval(interval);
  }, [ready]);

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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-[#00C2A8] opacity-75 animate-ping" />
              <span className="relative h-2 w-2 rounded-full bg-[#00C2A8]" />
            </span>
            <span className="text-[0.75rem] font-semibold text-[#00C2A8]">● Live</span>
          </div>
          <span className="text-[0.6875rem] text-[#94A0BC]">Updated just now</span>
        </div>

        <div className="space-y-2">
          {OPPORTUNITIES.map((op) => {
            const scoreStyles = getScoreStyles(op.score);
            const platformColor = PLATFORM_COLORS[op.platform] || "#635BFF";
            return (
              <motion.div
                key={op.title}
                className="rounded-xl border border-[#EBEEF5] px-3 py-2.5 flex gap-2.5 items-start transition-all bg-[#F4F6FB]/50"
                whileHover={{ borderColor: "#C7C3FF", background: "#EEEDFF/30" }}
              >
                <div
                  className="flex-shrink-0 flex items-center justify-center rounded-lg"
                  style={{
                    width: "28px",
                    height: "28px",
                    fontSize: "0.625rem",
                    fontWeight: 700,
                    color: "white",
                    background: platformColor,
                  }}
                >
                  {op.platform === "Upwork" ? "U" : op.platform === "Contra" ? "C" : "RO"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.8125rem] font-medium text-[#0B1221] truncate">{op.title}</p>
                  <p className="text-[0.6875rem] text-[#94A0BC]">{op.platform} · {op.budget}</p>
                </div>
                <div
                  className="flex-shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold"
                  style={{ color: scoreStyles.color, background: scoreStyles.background }}
                >
                  {op.score}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-3 rounded-xl border border-dashed border-[#EBEEF5] px-3 py-2 text-[0.75rem] text-[#94A0BC]">
          Scanned 14 platforms in the last hour · 47 opportunities found · 12 high matches
        </div>
      </div>
    </div>
  );
}
