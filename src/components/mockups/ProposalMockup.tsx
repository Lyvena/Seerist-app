"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const PROPOSAL =
  "Hi Sarah, I noticed you're looking for an invoicing solution for your freelance agency. InvoicePad was built exactly for this — it handles recurring invoices, auto-reminders, and client portals out of the box. Would love to show you how...";

export function ProposalMockup() {
  const [phase, setPhase] = useState<"ready" | "generating" | "typing" | "sent">("ready");
  const [text, setText] = useState("");
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const run = () => {
      setPhase("ready");
      setText("");

      const startId = window.setTimeout(() => {
        setPhase("generating");

        const generatingId = window.setTimeout(() => {
          setPhase("typing");
          let start: number | null = null;
          const tick = (time: number) => {
            if (!start) start = time;
            const elapsed = time - start;
            const chars = Math.min(Math.floor(elapsed / 28), PROPOSAL.length);
            setText(PROPOSAL.slice(0, chars));
            if (chars < PROPOSAL.length) {
              rafRef.current = requestAnimationFrame(tick);
            } else {
              const sentId = window.setTimeout(() => {
                setPhase("sent");
                const resetId = window.setTimeout(run, 2400);
                return () => window.clearTimeout(resetId);
              }, 900);
              return () => window.clearTimeout(sentId);
            }
          };
          rafRef.current = requestAnimationFrame(tick);
        }, 1200);

        return () => window.clearTimeout(generatingId);
      }, 800);

      return () => window.clearTimeout(startId);
    };

    const cleanup = run();
    return () => {
      cleanup?.();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3">
        <p className="text-xs text-gray-500">Opportunity</p>
        <p className="mt-1 text-sm font-semibold text-gray-900">Upwork · 94 score · $300 budget</p>
        <p className="text-xs text-gray-500">Need invoicing tool for my freelance agency</p>
      </div>
      <div className="mt-4 rounded-xl border border-gray-100 bg-white p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">Generate Proposal</p>
          {phase === "generating" && <span className="text-xs text-violet-600">Generating...</span>}
          {phase === "sent" && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100">
                ✓
              </motion.span>
              Sent to Upwork
            </span>
          )}
        </div>
        <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-800">
          <span>{text}</span>
          {phase === "typing" && (
            <motion.span
              className="ml-0.5 inline-block h-4 w-2 bg-gray-900 align-middle"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.55, repeat: Infinity, repeatType: "reverse" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
