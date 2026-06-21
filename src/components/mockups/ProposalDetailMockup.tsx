"use client";
import { useEffect, useRef, useState, memo } from "react";
import { motion } from "framer-motion";

const TONES = ["Professional", "Casual", "Concise", "Enthusiastic"] as const;
const PROPOSAL = "Hey Marcus, saw your post about needing an invoicing solution for your freelance agency. InvoicePad was built exactly for this — it handles recurring invoices, payment reminders, and client portals out of the box.";

function ProposalDetailMockupComponent() {
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
        {/* Browser chrome */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#EBEEF5]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
          <span className="text-[0.6875rem] text-[#94A0BC] ml-2">Proposal editor</span>
        </div>

        <div className="rounded-xl border border-[#EBEEF5] bg-[#F4F6FB] px-3 py-2 text-[0.75rem] text-[#5E6B8A]">
          Opportunity: Upwork · 94 score · $300 budget · Need invoicing tool for my freelance agency
        </div>

        <div className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[#F4F6FB] p-1 border border-[#EBEEF5]">
          {TONES.map((item) => (
            <button
              key={item}
              onClick={() => setTone(item)}
              className="rounded-md px-2.5 py-1.5 text-[0.75rem] font-medium transition-all"
              style={{
                background: tone === item ? "white" : "transparent",
                color: tone === item ? "#635BFF" : "#94A0BC",
                boxShadow: tone === item ? "0 1px 4px rgba(11,18,33,0.08)" : "none",
              }}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[0.75rem] text-[#94A0BC]">
            <span>Writing proposal...</span>
            <span className="font-semibold text-[#635BFF]">{progress}%</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#EBEEF5]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#635BFF] to-[#8B5CF6]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-[#EBEEF5] bg-[#F4F6FB] px-4 py-3 text-[0.875rem] text-[#2D3754]" style={{ minHeight: "110px" }}>
          <div className="flex justify-between items-start">
            <span>{text}</span>
            {phase === "typing" && (
              <motion.span
                className="ml-0.5 inline-block h-3 w-[2px] bg-[#635BFF] align-middle flex-shrink-0"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.55, repeat: Infinity, repeatType: "reverse" }}
              />
            )}
          </div>
          <span className="text-[0.6875rem] text-[#94A0BC] block mt-2">Words: {wordCount}</span>
        </div>

        <button className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#635BFF] to-[#8B5CF6] px-4 text-[0.875rem] font-semibold text-white transition hover:opacity-90">
          Generate Proposal
        </button>
      </div>
    </div>
  );
}

export const ProposalDetailMockup = memo(ProposalDetailMockupComponent)
