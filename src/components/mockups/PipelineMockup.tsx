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

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Pipeline</p>
          <p className="text-xs text-gray-500">Live deal view</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Total value</p>
          <p className="text-lg font-semibold text-gray-900">${pipelineValue.toLocaleString()}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {columns.map((column) => (
          <div key={column.name} className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">{column.name}</span>
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                {column.cards.length}
              </span>
            </div>
            <div className="space-y-2">
              {column.cards.map((card) => (
                <motion.div
                  key={card.id}
                  layout
                  className="rounded-xl border border-gray-100 bg-white p-2.5"
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                >
                  <p className="text-xs font-semibold text-gray-900">{card.title}</p>
                  <p className="text-[11px] text-gray-500">${card.value}</p>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
