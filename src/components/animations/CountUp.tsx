"use client";
import { useInView, useMotionValue, animate, useMotionValueEvent } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface Props {
  from?: number;
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
}

export function CountUp({
  from = 0,
  to,
  duration = 2,
  suffix = "",
  prefix = "",
  decimals = 0,
  className,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const count = useMotionValue(from);
  const [display, setDisplay] = useState(`${prefix}${from}${suffix}`);
  
  useMotionValueEvent(count, "change", (latest) => {
    setDisplay(decimals > 0 ? `${prefix}${latest.toFixed(decimals)}${suffix}` : `${prefix}${Math.round(Number(latest))}${suffix}`);
  });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [inView, to, duration, count, decimals, prefix, suffix]);

  return <span ref={ref} className={className}>{display}</span>;
}
