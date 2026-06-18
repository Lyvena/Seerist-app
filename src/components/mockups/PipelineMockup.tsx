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
      setCards((prev) =>
        prev.map((card, index) =>
          index === 1 ? { ...card, to: "In Negotiation" } : card
        )
      );
      const t2 = window.setTimeout(() => {
        setPhase("move2");
        setCards((prev) =>
          prev.map((card, index) =>
            index === 1 ? { ...card, to: "Won" } : card
          )
        );
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
    if (name === "Won") return { headerColor: "#059669", bg: "#ECFDF5" };
    return { headerColor: "#6B7280", bg: "#F9FAFB" };
  };

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
      <div className="grid grid-cols-4 gap-2.5">
        {columns.map((column) => {
          const colStyles = getColumnStyles(column.name);
          return (
            <div
              key={column.name}
              className="rounded-xl px-2.5 py-2.5"
              style={{
                width: "calc(25% - 6px)",
                background: colStyles.bg,
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[0.75rem] font-semibold uppercase tracking-wider" style={{ color: colStyles.headerColor, letterSpacing: "0.05em" }}>
                  {column.name}
                </span>
                <span className="rounded bg-[#E5E7EB] px-1.5 py-0.5 text-[0.6875rem] font-semibold text-[#374151]">
                  {column.cards.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {column.cards.map((card) => (
                  <motion.div
                    key={card.id}
                    layout
                    className="rounded-md border border-[#E5E7EB] bg-white px-2.5 py-2"
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  >
                    <p className="text-[0.75rem] font-semibold text-[#374151]" style={{ lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {card.title}
                    </p>
                    <p className="text-[0.6875rem] text-[#9CA3AF]">${card.value}</p>
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
