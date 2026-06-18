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
  const [glow, setGlow] = useState(false);
  const [ready, setReady] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 120);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const interval = window.setInterval(() => {
      setGlow(true);
      setActivePlatform((prev) => (prev + 1) % Object.keys(PLATFORM_COLORS).length);
      window.setTimeout(() => setGlow(false), 1000);
    }, 3000);
    return () => window.clearInterval(interval);
  }, [ready]);

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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-75 animate-ping" />
            <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[0.8125rem] font-semibold" style={{ color: "#10B981" }}>● Live</span>
        </div>
      </div>
      <div className="space-y-2">
        {OPPORTUNITIES.map((op) => {
          const scoreStyles = getScoreStyles(op.score);
          const platformColor = PLATFORM_COLORS[op.platform] || "#7C3AED";
          return (
            <motion.div
              key={op.title}
              className="rounded-lg border border-[#F3F4F6] px-3 py-2.5 flex gap-2.5 items-start transition-all"
              style={{
                background: "#FAFAFA",
                marginBottom: "8px",
              }}
              whileHover={{ borderColor: "#E5E7EB", background: "#F9FAFB" }}
            >
              <div
                className="flex-shrink-0 flex items-center justify-center rounded-full"
                style={{
                  width: "20px",
                  height: "20px",
                  fontSize: "0.625rem",
                  fontWeight: 700,
                  color: "white",
                  background: platformColor,
                }}
              >
                {op.platform === "Upwork" ? "U" : op.platform === "Contra" ? "C" : op.platform === "Remote OK" ? "RO" : "W"}
              </div>
              <div>
                <p className="text-[0.8125rem] font-medium text-[#111827]" style={{ lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {op.title}
                </p>
                <p className="text-[0.75rem] text-[#9CA3AF]">{op.platform} · {op.budget}</p>
              </div>
              <div
                className="ml-auto rounded-full px-2 py-0.5 text-[0.75rem] font-semibold"
                style={{ color: scoreStyles.color, background: scoreStyles.background }}
              >
                {op.score}
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="mt-3 rounded-lg border border-dashed border-[#E5E7EB] px-3 py-2 text-xs text-gray-500">
        Scanned 14 platforms in the last hour · 47 opportunities found · 12 high matches
      </div>
    </div>
  );
}
