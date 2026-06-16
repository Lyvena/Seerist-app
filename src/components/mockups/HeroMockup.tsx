"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Opportunity = {
  key: string;
  platform: string;
  score: number;
  title: string;
  budget: string;
  badgeTone: "green" | "blue";
  delay: number;
};

const OPPORTUNITIES: Opportunity[] = [
  { key: "upwork", platform: "Upwork", score: 94, title: "Need invoicing tool for my freelance agency", budget: "$200–$400", badgeTone: "green", delay: 0 },
  { key: "contra", platform: "Contra", score: 87, title: "Looking for project management software for remote team", budget: "$100–$250", badgeTone: "green", delay: 400 },
  { key: "weworkremotely", platform: "We Work Remotely", score: 72, title: "Automation tool for client onboarding needed", budget: "$50/mo SaaS budget", badgeTone: "blue", delay: 800 },
  { key: "freelancer", platform: "Freelancer.com", score: 65, title: "Seeking CRM tool recommendation", budget: "$300 fixed", badgeTone: "blue", delay: 1200 },
];

const TYPING_TEXT = "Hi! I noticed you're looking for an invoicing tool...";
const LOOP_MS = 8000;

export function HeroMockup() {
  const [ready, setReady] = useState(false);
  const [proposalState, setProposalState] = useState<"idle" | "generating" | "typing">("idle");
  const [typed, setTyped] = useState("");
  const [badgeA, setBadgeA] = useState(true);
  const [badgeB, setBadgeB] = useState(false);
  const [badgeC, setBadgeC] = useState(false);

  useEffect(() => {
    const mount = window.setTimeout(() => setReady(true), 120);
    return () => window.clearTimeout(mount);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const interval = window.setInterval(() => {
      setProposalState("generating");
      setTyped("");
      setTimeout(() => {
        setProposalState("typing");
        typeText(TYPING_TEXT, 0, () => {
          setTimeout(() => setProposalState("idle"), 1800);
        });
      }, 1400);
      cycleBadges();
    }, LOOP_MS);
    return () => window.clearInterval(interval);
  }, [ready]);

  const typeText = (text: string, index: number, onDone: () => void) => {
    if (index >= 45) {
      setTyped((prev) => (prev.length >= 45 ? prev : text.slice(0, 45) + "..."));
      onDone();
      return;
    }
    setTyped(text.slice(0, index + 1));
    window.setTimeout(() => typeText(text, index + 1, onDone), 28);
  };

  const cycleBadges = () => {
    setBadgeA(true);
    window.setTimeout(() => setBadgeB(true), 600);
    window.setTimeout(() => {
      setBadgeC(true);
      setBadgeA(false);
    }, 2200);
    window.setTimeout(() => setBadgeB(false), 3000);
    window.setTimeout(() => setBadgeC(false), 3600);
  };

  useEffect(() => {
    cycleBadges();
  }, []);

  return (
    <div className="relative mx-auto max-w-[640px] lg:max-w-4xl">
      {/* Floating badges */}
      <FloatingBadge visible={badgeA} side="right" top="18%" delay={0}>
        <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-lg">
          ⚡ New match on Upwork
        </span>
      </FloatingBadge>
      <FloatingBadge visible={badgeB} side="left" bottom="18%" delay={200}>
        <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-lg">
          ✅ Proposal sent · Contra
        </span>
      </FloatingBadge>
      <FloatingBadge visible={badgeC} side="right" top="48%" delay={100}>
        <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-lg">
          📈 Score: 94/100
        </span>
      </FloatingBadge>

      {/* Browser mockup */}
      <div
        className="relative overflow-hidden rounded-2xl border bg-white"
        style={{
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-lg)",
          animation: "float 8s ease-in-out infinite",
        }}
      >
        {/* Chrome */}
        <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <div className="ml-3 flex-1 rounded-full bg-gray-100 px-3 py-1 text-left text-xs text-gray-500" style={{ fontFamily: "var(--font-mono)" }}>
            app.seerist.xyz/opportunities
          </div>
        </div>

        {/* Feed */}
        <div className="space-y-3 p-4">
          {OPPORTUNITIES.map((op) => (
            <motion.div
              key={op.key}
              initial={{ x: 60, opacity: 0 }}
              animate={ready ? { x: 0, opacity: 1 } : { x: 60, opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: op.delay / 1000 }}
              className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-violet-50 font-semibold text-violet-700 text-xs">
                  {op.platform.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{op.title}</p>
                  <p className="text-xs text-gray-500">{op.platform} · {op.budget}</p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  op.badgeTone === "green" ? "bg-emerald-100 text-emerald-700" : "bg-sky-100 text-sky-700"
                }`}
              >
                {op.score}
              </span>
            </motion.div>
          ))}

          {/* Proposal generating state */}
          <AnimatePresence>
            {proposalState === "generating" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl border border-violet-200 bg-violet-50/80 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-violet-600" />
                    <div>
                      <p className="text-xs font-semibold text-violet-900">🤖 Proposal Generating...</p>
                      <p className="text-[11px] text-violet-700">Upwork · Need invoicing tool...</p>
                    </div>
                  </div>
                  <span className="text-[11px] text-violet-600">2s</span>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-violet-200">
                  <motion.div
                    className="h-full rounded-full bg-violet-600"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.5, ease: "linear" }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Typing cursor */}
          <AnimatePresence>
            {proposalState === "typing" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-gray-100 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-2 text-sm text-gray-800">
                  <span>{typed}</span>
                  <motion.span
                    className="inline-block h-4 w-2 bg-gray-900"
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.55, repeat: Infinity, repeatType: "reverse" }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

type FloatingBadgeProps = {
  visible: boolean;
  side: "left" | "right";
  top?: string;
  bottom?: string;
  delay?: number;
  children: React.ReactNode;
};

function FloatingBadge({ visible, side, top, bottom, delay = 0, children }: FloatingBadgeProps) {
  const initialX = side === "right" ? 60 : -60;
  const enterX = 0;
  const exitX = side === "right" ? 60 : -60;

  return (
    <motion.div
      initial={{ opacity: 0, x: initialX }}
      animate={visible ? { opacity: 1, x: enterX } : { opacity: 0, x: exitX }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: delay / 1000 }}
      className={`absolute z-20 hidden lg:block ${side === "right" ? "right-4" : "left-4"}`}
      style={{ top, bottom, animation: "float 6s ease-in-out infinite" }}
    >
      {children}
    </motion.div>
  );
}
