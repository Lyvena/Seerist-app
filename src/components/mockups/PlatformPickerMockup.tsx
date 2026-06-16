"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const PLATFORMS = [
  { name: "Upwork", active: true, delay: 0 },
  { name: "Contra", active: true, delay: 80 },
  { name: "Freelancer", active: true, delay: 160 },
  { name: "Toptal", active: false, delay: 240 },
  { name: "LinkedIn Jobs", active: false, delay: 320 },
  { name: "Fiverr", active: false, delay: 400 },
];

export function PlatformPickerMockup() {
  const [ready, setReady] = useState(false);
  const [threshold, setThreshold] = useState(70);

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 120);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold text-gray-500">Select platforms</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {PLATFORMS.map(({ name, active, delay }) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, y: 8 }}
            animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.35, delay: delay / 1000 }}
            className={`flex items-center justify-between rounded-xl border px-3 py-2 ${
              active ? "border-violet-200 bg-violet-50/60" : "border-gray-100 bg-gray-50/70"
            }`}
          >
            <span className="text-sm font-medium text-gray-900">{name}</span>
            <motion.button
              animate={{ x: active ? 4 : 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className={`inline-flex h-8 w-14 items-center rounded-full p-1 ${active ? "bg-violet-600" : "bg-gray-200"}`}
            >
              <motion.span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs text-gray-900 shadow-sm"
                animate={{ x: active ? 24 : 2 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
              >
                {active && <Check className="h-3 w-3 text-violet-600" />}
              </motion.span>
            </motion.button>
          </motion.div>
        ))}
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Min match score</span>
          <span className="font-semibold text-gray-900">{threshold}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="mt-2 h-2 w-full appearance-none rounded-full bg-gray-100 accent-violet-600"
        />
      </div>
    </div>
  );
}
