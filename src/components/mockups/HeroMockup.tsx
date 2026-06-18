"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, TrendingUp, Zap } from "lucide-react";

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
  { key: "contra", platform: "Contra", score: 87, title: "Project management software for remote team", budget: "$100–$250", delay: 0.1 },
  { key: "remote", platform: "Remote OK", score: 82, title: "Automation tool for client onboarding", budget: "$50/mo SaaS", delay: 0.2 },
  { key: "wework", platform: "We Work Remotely", score: 78, title: "CRM recommendation for growing agency", budget: "$300 fixed", delay: 0.3 },
];

const TYPING_TEXT = "I noticed your agency needs faster invoicing. InvoicePad handles recurring bills, reminders, and client portals out of the box — want me to show you the fastest setup?";
const LOOP_MS = 8000;

export function HeroMockup() {
  const [ready, setReady] = useState(false);
  const [proposalState, setProposalState] = useState<"idle" | "generating" | "typing" | "sent">("idle");
  const [typed, setTyped] = useState("");
  const [activeOpportunity, setActiveOpportunity] = useState(0);

  useEffect(() => {
    const mount = window.setTimeout(() => setReady(true), 200);
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
          window.setTimeout(() => setProposalState("sent"), 800);
          window.setTimeout(() => setProposalState("idle"), 2000);
        });
      }, 1200);
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
    window.setTimeout(() => typeText(text, index + 1, onDone), 22);
  };

  return (
    <div className="relative mx-auto max-w-[840px]">
      {/* Glow behind mockup */}
      <div
        className="absolute -z-10 pointer-events-none"
        aria-hidden="true"
        style={{
          width: "130%",
          height: "130%",
          top: "-15%",
          left: "-15%",
          background: "radial-gradient(ellipse, rgba(99,91,255,0.08) 0%, rgba(0,194,168,0.04) 40%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <div
        className="overflow-hidden rounded-2xl border border-[#E4E8F2] bg-white"
        style={{ boxShadow: "0 32px 80px rgba(11,18,33,0.1), 0 8px 24px rgba(11,18,33,0.04)" }}
      >
        {/* Browser chrome */}
        <div
          className="flex items-center border-b border-[#EBEEF5]"
          style={{ height: "40px", background: "#F4F6FB", padding: "0 16px", gap: "8px" }}
        >
          <div className="flex items-center gap-1.5">
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#FF5F57" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#FEBC2E" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#28C840" }} />
          </div>
          <div
            className="flex-1 flex items-center justify-center"
            style={{
              background: "white",
              borderRadius: "6px",
              height: "24px",
              maxWidth: "280px",
              fontSize: "0.75rem",
              color: "#94A0BC",
              fontFamily: "var(--font-mono)",
              border: "1px solid #EBEEF5",
            }}
          >
            <span className="text-[#00C2A8] mr-1">●</span> app.seerist.xyz/dashboard
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
          {/* Left panel — Opportunity feed */}
          <div className="p-4 lg:p-5 border-b border-[#EBEEF5] lg:border-b-0 lg:border-r">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#0B1221]">Top matches</p>
                <p className="text-[0.6875rem] text-[#94A0BC] mt-0.5">Updated just now</p>
              </div>
              <span className="rounded-full bg-gradient-to-r from-[#635BFF] to-[#8B5CF6] px-2.5 py-0.5 text-[0.6875rem] font-semibold text-white">
                12 high intent
              </span>
            </div>

            <div className="space-y-2">
              {OPPORTUNITIES.map((op, index) => {
                const active = index === activeOpportunity;
                return (
                  <motion.div
                    key={op.key}
                    initial={{ opacity: 0, x: 16 }}
                    animate={ready ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: op.delay }}
                    className="rounded-xl border p-2.5 transition-all duration-300"
                    style={{
                      background: active ? "#F4F6FB" : "white",
                      borderColor: active ? "#C7C3FF" : "#EBEEF5",
                      boxShadow: active ? "0 2px 12px rgba(99,91,255,0.08)" : "none",
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex-shrink-0 flex items-center justify-center rounded-lg"
                        style={{
                          width: "36px",
                          height: "36px",
                          background: active ? "linear-gradient(135deg, #635BFF, #8B5CF6)" : "#ECFDF5",
                          color: active ? "white" : "#059669",
                          fontSize: "0.8125rem",
                          fontWeight: 700,
                        }}
                      >
                        {op.score}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.8125rem] font-medium text-[#0B1221] truncate">{op.title}</p>
                        <p className="text-[0.6875rem] text-[#94A0BC]">{op.platform} · {op.budget}</p>
                      </div>
                      <button
                        className="flex-shrink-0 rounded-lg px-2 py-1 text-[0.6875rem] font-semibold transition-colors"
                        style={{
                          background: active ? "#635BFF" : "#EEEDFF",
                          color: active ? "white" : "#635BFF",
                        }}
                      >
                        Generate
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <MiniStat icon={<Zap className="w-3 h-3" />} label="Scanned" value="14" />
              <MiniStat icon={<TrendingUp className="w-3 h-3" />} label="Filtered" value="12" />
              <MiniStat icon={<CheckCircle2 className="w-3 h-3" />} label="Ready" value="8" />
            </div>
          </div>

          {/* Right panel — AI Proposal + Pipeline */}
          <div className="p-4 lg:p-5">
            {/* AI Proposal card */}
            <div className="rounded-2xl border border-[#EBEEF5] bg-white p-4" style={{ boxShadow: "0 2px 12px rgba(11,18,33,0.03)" }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-[#0B1221]">AI proposal</p>
                  <p className="text-[0.6875rem] text-[#94A0BC]">Tone: helpful · concise</p>
                </div>
                <AnimatePresence mode="wait">
                  {proposalState === "sent" && (
                    <motion.span
                      key="sent"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-[0.6875rem] font-semibold text-[#059669]"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Sent
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <div className="rounded-xl bg-[#F4F6FB] p-3" style={{ minHeight: "140px" }}>
                <div className="flex items-center justify-between text-[0.6875rem] text-[#94A0BC] mb-2">
                  <span>{OPPORTUNITIES[activeOpportunity].platform}</span>
                  <span className="inline-flex items-center gap-1 text-[#5E6B8A]">
                    <Clock className="h-3 w-3" />
                    {proposalState === "idle" ? "Ready" : proposalState}
                  </span>
                </div>
                <div className="text-[0.8125rem] leading-relaxed text-[#2D3754]">
                  <AnimatePresence mode="wait">
                    {proposalState === "generating" ? (
                      <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="space-y-2">
                          <div className="h-1.5 w-3/4 rounded-full bg-[#DDD6FE]">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-[#635BFF] to-[#8B5CF6]"
                              initial={{ width: "0%" }}
                              animate={{ width: "100%" }}
                              transition={{ duration: 1.2, ease: "linear" }}
                            />
                          </div>
                          <div className="h-1.5 w-2/3 rounded-full bg-[#EBEEF5]" />
                          <div className="h-1.5 w-1/2 rounded-full bg-[#EBEEF5]" />
                          <p className="text-[0.6875rem] font-medium text-[#635BFF] mt-2">Reading job post and matching product strengths...</p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <span>{typed || "Select a match and Seerist will draft a proposal that sounds like you — not like a template."}</span>
                        {proposalState === "typing" && (
                          <motion.span
                            className="ml-0.5 inline-block h-3.5 w-[2px] align-middle bg-[#635BFF]"
                            animate={{ opacity: [1, 0] }}
                            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                          />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="rounded-xl border border-[#EBEEF5] px-3 py-2.5 text-[0.8125rem] font-medium text-[#5E6B8A] transition hover:border-[#C7C3FF] hover:bg-[#EEEDFF]">
                  Edit draft
                </button>
                <button className="rounded-xl bg-gradient-to-r from-[#635BFF] to-[#8B5CF6] px-3 py-2.5 text-[0.8125rem] font-semibold text-white transition hover:opacity-90">
                  Send proposal
                </button>
              </div>
            </div>

            {/* Pipeline forecast */}
            <div className="mt-3 rounded-2xl bg-gradient-to-br from-[#EEEDFF] to-[#E0FAF6]/40 p-4 border border-[#DDD6FE]/50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-[#0B1221]">Pipeline forecast</p>
                  <p className="text-[0.6875rem] text-[#94A0BC]">From open opportunities</p>
                </div>
                <p
                  className="text-xl font-bold gradient-text-full"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  $4,820
                </p>
              </div>
              <div className="space-y-2">
                {[
                  { width: 76, color: "from-[#635BFF] to-[#8B5CF6]" },
                  { width: 58, color: "from-[#8B5CF6] to-[#A78BFA]" },
                  { width: 88, color: "from-[#00C2A8] to-[#059669]" },
                  { width: 42, color: "from-[#F59E0B] to-[#D97706]" },
                ].map((bar, index) => (
                  <div key={index} className="h-1.5 rounded-full bg-white/60">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${bar.color}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${bar.width}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    />
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

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F4F6FB] p-2.5 text-center">
      <div className="flex items-center justify-center gap-1 text-[#635BFF] mb-0.5">
        {icon}
        <p className="text-base font-bold text-[#0B1221]" style={{ fontFamily: "var(--font-heading)" }}>{value}</p>
      </div>
      <p className="text-[0.625rem] font-medium uppercase tracking-wider text-[#94A0BC]">{label}</p>
    </div>
  );
}
