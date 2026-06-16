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
    <div className="rounded-2xl border border-[var(--color-border)] bg-white shadow-sm">
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
        <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-3 py-2 text-xs text-gray-600">
          Opportunity: Upwork · 94 score · $300 budget · Need invoicing tool for my freelance agency
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {TONES.map((item) => (
            <button
              key={item}
              onClick={() => setTone(item)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                tone === item ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Writing proposal...</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
            <motion.div
              className="h-full rounded-full bg-violet-600"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-gray-100 bg-white px-4 py-3">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Proposal preview</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
              {wordCount} words
            </span>
          </div>
          <div className="mt-2 min-h-[140px] text-sm leading-relaxed text-gray-800">
            <span>{text}</span>
            {phase === "typing" && (
              <motion.span
                className="ml-0.5 inline-block h-3.5 w-2 bg-gray-900 align-middle"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.55, repeat: Infinity, repeatType: "reverse" }}
              />
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-[var(--color-border)] text-sm font-medium text-gray-700 transition hover:border-gray-400">
            Copy
          </button>
          <button
            className={`inline-flex h-10 flex-1 items-center justify-center rounded-xl text-sm font-semibold text-white transition ${
              phase === "done" ? "bg-emerald-600" : "bg-violet-600 hover:bg-violet-700"
            }`}
          >
            {phase === "done" ? "Sent ✓" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
