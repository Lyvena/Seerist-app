"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const TONES = ["Professional", "Casual", "Concise", "Enthusiastic"] as const;
const PROPOSAL =
  "Hey Marcus, saw your post about needing an invoicing solution for your freelance agency. InvoicePad was built exactly for this — it handles recurring invoices, payment reminders, and client portals out of the box.";

export function ProposalDetailMockup() {
  const [phase, setPhase] = useState<"idle" | "writing" | "typing" | "done">("idle");
  const [text, setText] = useState("");
  const [tone, setTone] = useState<(typeof TONES)[number]>("Professional");
  const [wordCount, setWordCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startId = window.setTimeout(() => {
      setPhase("writing");
      const writingId = window.setTimeout(() => {
        setPhase("typing");
        setProgress(73);
        let start: number | null = null;
        const tick = (time: number) => {
          if (!start) start = time;
          const elapsed = time - start;
          const chars = Math.min(Math.floor(elapsed / 28), PROPOSAL.length);
          setText(PROPOSAL.slice(0, chars));
          setWordCount(Math.floor(chars / 4.8));
          if (chars < PROPOSAL.length) {
            rafRef.current = requestAnimationFrame(tick);
          } else {
            const doneId = window.setTimeout(() => {
              setPhase("done");
              const resetId = window.setTimeout(run, 2600);
              return () => window.clearTimeout(resetId);
            }, 600);
            return () => window.clearTimeout(doneId);
          }
        };
        rafRef.current = requestAnimationFrame(tick);
      }, 1000);

      return () => window.clearTimeout(writingId);
    }, 800);

    const run = () => {
      setPhase("idle");
      setText("");
      setProgress(0);
      setWordCount(0);
    };

    return () => window.clearTimeout(startId);
  }, []);

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
      <div className="border-b border-gray-100 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <span className="text-xs text-gray-500">Proposal editor</span>
        </div>
      </div>
      <div className="p-4">
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-xs text-gray-800">
          Opportunity: Upwork · 94 score · $300 budget · Need invoicing tool for my freelance agency
        </div>
        <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#F3F4F6] p-1.5">
          {TONES.map((item) => (
            <button
              key={item}
              onClick={() => setTone(item)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-all ${
                tone === item ? "bg-white shadow text-violet-600" : "bg-transparent text-gray-600 hover:bg-gray-200/50"
              }`}
              style={{
                boxShadow: tone === item ? "0 1px 3px rgba(0,0,0,0.1)" : undefined,
              }}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Writing proposal...</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F3F4F6]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-3.5 text-sm text-gray-800" style={{ minHeight: "120px" }}>
          <div className="flex justify-between">
            <span>{text}</span>
            {phase === "typing" && (
              <motion.span
                className="ml-0.5 inline-block h-3.5 w-2 bg-gray-900 align-middle"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.55, repeat: Infinity, repeatType: "reverse" }}
              />
            )}
            <span className="text-[0.6875rem] text-gray-400 self-end ml-auto">Words: {wordCount}</span>
          </div>
        </div>
        <button className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg bg-violet-600 px-4.5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700">
          Generate Proposal
        </button>
      </div>
    </div>
  );
}
