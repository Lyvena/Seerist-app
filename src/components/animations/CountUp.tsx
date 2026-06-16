"use client";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef } from "react";

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
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const count = useMotionValue(from);
  const rounded = useTransform(count, (value) => `${prefix}${value.toFixed(decimals)}${suffix}`);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, to, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => count.set(latest),
    });
    return controls.stop;
  }, [inView, to, duration, count, suffix, prefix, decimals]);

  return <span ref={ref} className={className} />;
}
