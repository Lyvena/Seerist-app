"use client";

import { motion } from "framer-motion";
import { Activity, Brain, Search, Target, Zap } from "lucide-react";

type Signal = {
  id: string;
  platform: string;
  score: number;
  x: number;
  y: number;
  icon: "search" | "brain" | "target" | "zap" | "activity";
};

const SIGNALS: Signal[] = [
  { id: "upwork", platform: "Upwork", score: 94, x: 28, y: 25, icon: "target" },
  { id: "contra", platform: "Contra", score: 87, x: 70, y: 34, icon: "brain" },
  { id: "remote-ok", platform: "Remote OK", score: 82, x: 78, y: 68, icon: "activity" },
  { id: "weworkremotely", platform: "We Work Remotely", score: 78, x: 34, y: 74, icon: "search" },
  { id: "linkedin", platform: "LinkedIn Jobs", score: 73, x: 52, y: 48, icon: "zap" },
];

const iconMap = {
  search: Search,
  brain: Brain,
  target: Target,
  zap: Zap,
  activity: Activity,
};

export function RadarGraphic() {
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div className="absolute -inset-10 rounded-[48px] bg-violet-500/5 blur-3xl" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[32px] border border-violet-100 bg-white/95 p-4 shadow-[var(--shadow-lg)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(124,58,237,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(124,58,237,0.03)_1px,transparent_1px)] bg-[size:28px_28px] opacity-60" aria-hidden="true" />
        <div className="relative">
          <div className="flex items-center justify-between border-b border-violet-100/80 px-2 py-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-3 w-3">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-70" />
                <span className="relative h-3 w-3 rounded-full bg-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Opportunity radar</p>
                <p className="text-xs text-slate-500">Live scan across 14 platforms</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">47 found</span>
          </div>

          <div className="relative grid min-h-[360px] place-items-center py-4 md:min-h-[420px]">
            <div className="absolute inset-8 rounded-full border border-violet-200/70" />
            <div className="absolute inset-16 rounded-full border border-violet-200/70" />
            <div className="absolute inset-24 rounded-full border border-violet-200/70" />
            <motion.div
              className="absolute inset-8 rounded-full"
              style={{ transformOrigin: "50% 50%" }}
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              aria-hidden="true"
            >
              <div className="absolute left-1/2 top-0 h-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-violet-500/70 to-transparent" />
            </motion.div>

{SIGNALS.map((signal, index) => {
                const Icon = iconMap[signal.icon];
                return (
                  <motion.div
                    key={signal.id}
                    className="absolute"
                    style={{ left: `${signal.x}%`, top: `${signal.y}%` }}
                    initial={{ opacity: 0, scale: 0.7 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.55, delay: 0.12 * index, ease: [0.16, 1, 0.3, 1] }}
                    animate={{ y: [0, -8, 0] }}
                  >
                    <div className="relative flex items-center gap-2 rounded-full border border-violet-100 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="text-left">
                        <p className="text-xs font-semibold text-gray-900">{signal.platform}</p>
                        <p className="text-[11px] text-gray-500">{signal.score}% match</p>
                      </div>
                      <motion.span
                        className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-violet-500"
                        animate={{ scale: [1, 1.7, 1], opacity: [0.8, 0, 0.8] }}
                        transition={{ duration: 1.8, repeat: Infinity }}
                      />
                    </div>
                  </motion.div>
                );
              })}

<div className="relative z-10 flex h-36 w-36 items-center justify-center rounded-full border border-violet-100 bg-white shadow-xl md:h-44 md:w-44">
               <div className="text-center">
                 <motion.p
                   className="font-semibold tracking-tight text-gray-900"
                   style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(44px, 8vw, 72px)", lineHeight: 1 }}
                   initial={{ opacity: 0, y: 10 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                 >
                   47
                 </motion.p>
                 <p className="mt-2 text-xs font-medium uppercase tracking-widest text-violet-700">new leads</p>
               </div>
             </div>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-violet-100/80 px-2 pb-3 pt-4">
            <Metric label="Scanned" value="14" />
            <Metric label="Filtered" value="12" />
            <Metric label="Ready" value="8" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-white/90 p-3 text-center backdrop-blur">
      <p className="text-xl font-semibold text-gray-900" style={{ fontFamily: "var(--font-heading)" }}>{value}</p>
      <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
    </div>
  );
}
