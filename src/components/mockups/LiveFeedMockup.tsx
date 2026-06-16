"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const PLATFORMS = ["Upwork", "Contra", "Remote OK", "We Work Remotely"];
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
      setActivePlatform((prev) => (prev + 1) % PLATFORMS.length);
      window.setTimeout(() => setGlow(false), 1000);
    }, 3000);
    return () => window.clearInterval(interval);
  }, [ready]);

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-75 animate-ping" />
            <span className="relative rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold text-gray-900">Live · Monitoring 8 platforms</span>
        </div>
        <span className="text-xs text-gray-500">{PLATFORMS[activePlatform]}</span>
      </div>
      <div className="mt-4 space-y-3">
        {OPPORTUNITIES.map((op) => (
          <motion.div
            key={op.title}
            className={`rounded-2xl border bg-gray-50/80 px-4 py-3 ${
              glow ? "border-violet-400 shadow-[0_0_0_4px_rgba(124,58,237,0.08)]" : "border-gray-100"
            }`}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{op.title}</p>
                <p className="text-xs text-gray-500">
                  {op.platform} · {op.budget}
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{op.score}</span>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-500">
        Scanned 14 platforms in the last hour · 47 opportunities found · 12 high matches
      </div>
    </div>
  );
}
