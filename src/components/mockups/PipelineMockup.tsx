"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

type Card = { id: string; title: string; from: string; to: string; value: number };

const INITIAL_CARDS: Card[] = [
  { id: "1", title: "InvoicePad inquiry", from: "New", to: "Proposed", value: 300 },
  { id: "2", title: "Webflow theme request", from: "New", to: "Proposed", value: 500 },
  { id: "3", title: "CRM for agency", from: "New", to: "Proposed", value: 240 },
];

export function PipelineMockup() {
  const [phase, setPhase] = useState<"idle" | "move1" | "move2" | "done">("idle");
  const [cards, setCards] = useState<Card[]>(INITIAL_CARDS);
  const [pipelineValue, setPipelineValue] = useState(INITIAL_CARDS.reduce((sum, card) => sum + card.value, 0));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 120);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t1 = window.setTimeout(() => {
      setPhase("move1");
      setCards((prev) => prev.map((card, index) => index === 1 ? { ...card, to: "In Negotiation" } : card));
      const t2 = window.setTimeout(() => {
        setPhase("move2");
        setCards((prev) => prev.map((card, index) => index === 1 ? { ...card, to: "Won" } : card));
        setPipelineValue((prev) => prev + 140);
        const t3 = window.setTimeout(() => setPhase("done"), 1200);
        return () => window.clearTimeout(t3);
      }, 1800);
      return () => window.clearTimeout(t2);
    }, 1400);
    return () => window.clearTimeout(t1);
  }, [ready]);

  const columns = [
    { name: "New", cards: cards.filter((card) => card.to === "New") },
    { name: "Proposed", cards: cards.filter((card) => card.to === "Proposed") },
    { name: "In Negotiation", cards: cards.filter((card) => card.to === "In Negotiation") },
    { name: "Won", cards: cards.filter((card) => card.to === "Won") },
  ];

  const getColumnStyles = (name: string) => {
    if (name === "Won") return { headerColor: "#059669", bg: "#ECFDF5", dotColor: "#059669" };
    if (name === "In Negotiation") return { headerColor: "#635BFF", bg: "#EEEDFF", dotColor: "#635BFF" };
    return { headerColor: "#94A0BC", bg: "#F4F6FB", dotColor: "#94A0BC" };
  };

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

      <div className="relative grid grid-cols-4 gap-2">
        {columns.map((column) => {
          const colStyles = getColumnStyles(column.name);
          return (
            <div
              key={column.name}
              className="rounded-xl px-2 py-2"
              style={{ background: colStyles.bg }}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: colStyles.dotColor }} />
                  <span className="text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: colStyles.headerColor }}>
                    {column.name}
                  </span>
                </div>
                <span className="rounded bg-white px-1.5 py-0.5 text-[0.625rem] font-semibold text-[#5E6B8A] border border-[#EBEEF5]">
                  {column.cards.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {column.cards.map((card) => (
                  <motion.div
                    key={card.id}
                    layout
                    className="rounded-lg border border-[#EBEEF5] bg-white px-2 py-1.5"
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  >
                    <p className="text-[0.6875rem] font-medium text-[#2D3754] line-clamp-2">{card.title}</p>
                    <p className="text-[0.625rem] text-[#94A0BC]">${card.value}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
