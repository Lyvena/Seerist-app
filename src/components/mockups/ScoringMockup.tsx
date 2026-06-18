"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const SCORE = 94;
const SUB_SCORES = [
  { label: "Relevance", value: 97 },
  { label: "Budget Fit", value: 88 },
  { label: "Timing", value: 91 },
];

const REASON =
  "Strong match — the poster needs exactly what InvoicePad provides, with a budget aligned to your pricing tier.";

export function ScoringMockup() {
  const [ready, setReady] = useState(false);
  const [typed, setTyped] = useState("");
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 120);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const run = () => {
      setTyped("");
      let start: number | null = null;
      const tick = (time: number) => {
        if (!start) start = time;
        const elapsed = time - start;
        const chars = Math.min(Math.floor(elapsed / 32), REASON.length);
        setTyped(REASON.slice(0, chars));
        if (chars < REASON.length) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    };
    const cleanup = run();
    return cleanup;
  }, [ready]);

  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (SCORE / 100) * circumference;

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
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">{REASON.split(".")[0]}.</p>
            <p className="text-xs text-gray-500">Upwork · $200–$400 budget</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold text-emerald-700">{SCORE}</div>
            <div className="text-xs text-gray-400">/ 100</div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100" style={{ width: "140px", height: "140px" }}>
              <circle cx="50" cy="50" r="45" fill="none" stroke="#F3F4F6" strokeWidth="10" strokeLinecap="round" />
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="url(#scoreGradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={ready ? { strokeDashoffset: offset } : {}}
                transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-2xl font-semibold text-gray-900">{SCORE}</div>
            </div>
          </div>
          <div className="w-full space-y-3">
            {SUB_SCORES.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 8 }}
                animate={ready ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.6 + index * 0.15 }}
              >
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{item.label}</span>
                  <span className="font-semibold text-violet-600">{item.value}%</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-[#F3F4F6]">
                  <motion.div
                    className="h-full rounded-full bg-violet-600"
                    initial={{ width: "0%" }}
                    animate={ready ? { width: `${item.value}%` } : {}}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.6 + index * 0.15 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-sm text-violet-900">
          <span>{typed}</span>
          {ready && (
            <motion.span
              className="ml-0.5 inline-block h-3.5 w-2 bg-gray-900 align-middle"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.55, repeat: Infinity, repeatType: "reverse" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
