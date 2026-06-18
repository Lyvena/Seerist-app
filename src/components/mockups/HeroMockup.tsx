"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock } from "lucide-react";

type Opportunity = {
  key: string;
  platform: string;
  score: number;
  title: string;
  budget: string;
  delay: number;
};

const OPPORTUNITIES: Opportunity[] = [
  { key: "upwork", platform: "Upwork", score: 94, title: "Need invoicing tool for my freelance agency", budget: "$200–$400", delay: 0 },
  { key: "contra", platform: "Contra", score: 87, title: "Project management software for remote team", budget: "$100–$250", delay: 0.12 },
  { key: "remote", platform: "Remote OK", score: 82, title: "Automation tool for client onboarding", budget: "$50/mo SaaS", delay: 0.24 },
  { key: "wework", platform: "We Work Remotely", score: 78, title: "CRM recommendation for growing agency", budget: "$300 fixed", delay: 0.36 },
];

const TYPING_TEXT = "I noticed your agency needs faster invoicing. InvoicePad handles recurring bills, reminders, and client portals out of the box — want me to show you the fastest setup?";
const LOOP_MS = 8500;

export function HeroMockup() {
  const [ready, setReady] = useState(false);
  const [proposalState, setProposalState] = useState<"idle" | "generating" | "typing" | "sent">("idle");
  const [typed, setTyped] = useState("");
  const [activeOpportunity, setActiveOpportunity] = useState(0);

  useEffect(() => {
    const mount = window.setTimeout(() => setReady(true), 160);
    return () => window.clearTimeout(mount);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const interval = window.setInterval(() => {
      setActiveOpportunity((prev) => (prev + 1) % OPPORTUNITIES.length);
      setProposalState("generating");
      setTyped("");
      window.setTimeout(() => {
        setProposalState("typing");
        typeText(TYPING_TEXT, 0, () => {
          window.setTimeout(() => setProposalState("sent"), 900);
          window.setTimeout(() => setProposalState("idle"), 2200);
        });
      }, 1300);
    }, LOOP_MS);
    return () => window.clearInterval(interval);
  }, [ready]);

  const typeText = (text: string, index: number, onDone: () => void) => {
    if (index >= 92) {
      setTyped((prev) => (prev.length >= 92 ? prev : text.slice(0, 92) + "..."));
      onDone();
      return;
    }
    setTyped(text.slice(0, index + 1));
    window.setTimeout(() => typeText(text, index + 1, onDone), 24);
  };

  return (
    <div className="relative mx-auto max-w-[800px]">
      {/* Violet glow behind mockup */}
      <div
        className="absolute -z-10"
        aria-hidden="true"
        style={{
          width: "120%",
          height: "120%",
          top: "-10%",
          left: "-10%",
          background: "radial-gradient(ellipse, rgba(124,58,237,0.15) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div className="overflow-hidden rounded-[16px] border border-gray-200 bg-white shadow-lg" style={{ boxShadow: "0 32px 80px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.06)", borderTop: "none" }}>
        {/* Browser chrome */}
        <div
          className="flex items-center"
          style={{
            height: "44px",
            background: "#F3F4F6",
            borderRadius: "16px 16px 0 0",
            padding: "0 16px",
            gap: "8px",
          }}
        >
          {/* Traffic light dots */}
          <div className="flex items-center gap-2">
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#FF5F57" }} />
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#FEBC2E" }} />
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#28C840" }} />
          </div>
          {/* URL bar */}
          <div
            className="flex-1"
            style={{
              background: "white",
              borderRadius: "6px",
              height: "24px",
              maxWidth: "300px",
              marginInline: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              color: "#9CA3AF",
              fontFamily: "monospace",
            }}
          >
            app.seerist.xyz/opportunity-feed
          </div>
        </div>

        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="border-b border-gray-100 p-4 lg:border-b-0 lg:border-r">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Top opportunities</p>
                <p className="text-xs text-gray-500">Updated just now</p>
              </div>
              <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white">12 high intent</span>
            </div>

            <div className="space-y-2">
              {OPPORTUNITIES.map((op, index) => {
                const active = index === activeOpportunity;
                return (
                  <motion.div
                    key={op.key}
                    initial={{ opacity: 0, x: 20 }}
                    animate={ready ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.45, delay: op.delay }}
                    className="rounded-[10px] border p-3 mb-2 transition duration-300"
                    style={{
                      background: "white",
                      borderColor: "#F3F4F6",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div
                      className="flex-shrink-0 flex items-center justify-center"
                      style={{
                        minWidth: "40px",
                        height: "40px",
                        borderRadius: "8px",
                        background: "#ECFDF5",
                        color: "#059669",
                        fontSize: "0.875rem",
                        fontWeight: 700,
                      }}
                    >
                      {op.score}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{op.title}</p>
                      <p className="text-xs text-gray-400">{op.platform} · {op.budget}</p>
                    </div>
                    <button
                      className="ml-auto rounded-full px-2 py-1 text-xs"
                      style={{
                        background: "#EDE9FE",
                        color: "#7C3AED",
                      }}
                    >
                      Generate →
                    </button>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniStat label="Scanned" value="14" />
              <MiniStat label="Filtered" value="12" />
              <MiniStat label="Ready" value="8" />
            </div>
          </div>

          <div className="p-4">
            <div className="rounded-[24px] border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">AI proposal preview</p>
                  <p className="text-xs text-gray-500">Tone: helpful · concise · buyer-specific</p>
                </div>
                <AnimatePresence mode="wait">
                  {proposalState === "sent" && (
                    <motion.span
                      key="sent"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Sent
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Opportunity: {OPPORTUNITIES[activeOpportunity].platform}</span>
                  <span className="inline-flex items-center gap-1 text-gray-700">
                    <Clock className="h-3.5 w-3.5" />
                    {proposalState === "idle" ? "Ready" : proposalState}
                  </span>
                </div>
                <div className="mt-3 min-h-[164px] text-sm leading-relaxed text-gray-700">
                  <AnimatePresence mode="wait">
                    {proposalState === "generating" ? (
                      <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="space-y-3">
                          <div className="h-2 w-3/4 rounded-full bg-violet-100">
                            <motion.div className="h-full rounded-full bg-violet-600" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 1.2, ease: "linear" }} />
                          </div>
                          <div className="h-2 w-2/3 rounded-full bg-gray-200" />
                          <div className="h-2 w-1/2 rounded-full bg-gray-200" />
                          <p className="text-xs font-medium text-violet-700">Reading job post and matching product strengths...</p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <span>{typed || "Select a match and Seerist will draft a proposal that sounds like you — not like a template."}</span>
                        {proposalState === "typing" && <motion.span className="ml-0.5 inline-block h-4 w-2 align-middle bg-gray-900" animate={{ opacity: [1, 0] }} transition={{ duration: 0.55, repeat: Infinity, repeatType: "reverse" }} />}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50">
                  Edit draft
                </button>
                <button className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800">
                  Send proposal
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] bg-gray-900 p-4 text-white shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Pipeline forecast</p>
                  <p className="text-xs text-gray-400">Projected from open opportunities</p>
                </div>
                <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>$4,820</p>
              </div>
              <div className="mt-5 space-y-3">
                {[76, 58, 88, 42].map((width, index) => (
                  <div key={index} className="h-2 rounded-full bg-white/10">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-emerald-300" initial={{ width: 0 }} whileInView={{ width: `${width}%` }} viewport={{ once: true }} transition={{ duration: 1.1, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 text-center">
      <p className="text-lg font-semibold text-slate-900" style={{ fontFamily: "var(--font-heading)" }}>{value}</p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}
