"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const EVENTS = [
  {
    time: "6:00 AM",
    label: "Seerist scans all platforms",
    detail: "14 platforms checked",
  },
  {
    time: "7:00 AM",
    label: "New posts found and scored",
    detail: "47 new posts · 12 above threshold",
  },
  {
    time: "8:00 AM",
    label: "Daily digest hits your inbox",
    detail: "Top 10 matches highlighted",
  },
  {
    time: "9:00 AM",
    label: "You review top matches",
    detail: "5 proposals over coffee",
  },
  {
    time: "10:00 AM",
    label: "Proposals generated and sent",
    detail: "2 auto-sent, 1 reviewed",
  },
  {
    time: "4:00 PM",
    label: "First response received",
    detail: "Client reply on Upwork",
  },
  {
    time: "5:00 PM",
    label: "Pipeline updated",
    detail: "Revenue tracker ticks up",
  },
];

export function TimelineSection() {
  const containerRef = useRef<HTMLElement | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll("[data-timeline-event]");
    if (items.length === 0) return;

    const ctx = ScrollTrigger.create({
      trigger: container,
      start: "top 70%",
      end: "bottom 80%",
      onUpdate: (self) => {
        const progress = self.progress;
        const next = Math.ceil(progress * items.length);
        setVisibleCount((prev) => Math.max(prev, Math.min(next, items.length)));
      },
    });

    return () => ctx.kill();
  }, []);

  return (
    <section ref={containerRef} className="bg-white py-24">
      <div className="container">
        <div className="mb-16 text-center">
          <h2
            className="text-3xl font-semibold tracking-tight md:text-4xl"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-text-1)" }}
          >
            A typical day in Seerist
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base" style={{ color: "var(--color-text-3)" }}>
            From scanning to closing deals — fully automated.
          </p>
        </div>

        <div className="relative">
          <div
            className="absolute left-4 top-0 hidden h-full w-px bg-gray-200 md:left-1/2 md:-translate-x-1/2"
            aria-hidden="true"
          />
          <div className="space-y-8">
            {EVENTS.map((event, index) => {
              const isVisible = index < visibleCount;
              const isLeft = index % 2 === 0;
              return (
                <div
                  key={event.time}
                  data-timeline-event
                  className="relative grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8"
                >
                  <div className={`md:text-right ${isLeft ? "" : "md:order-2"}`}>
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={isVisible ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                      className="rounded-2xl border border-[var(--color-border)] bg-white p-5 shadow-sm"
                    >
                      <span className="text-xs font-semibold uppercase tracking-widest text-violet-700">
                        {event.time}
                      </span>
                      <p className="mt-1 text-base font-semibold text-gray-900">{event.label}</p>
                      <p className="text-sm text-gray-500">{event.detail}</p>
                    </motion.div>
                  </div>
                  <div className={`hidden md:block ${isLeft ? "" : "md:order-1"}`} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
