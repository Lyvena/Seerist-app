"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

type As = "div" | "section" | "p" | "span";

interface Props {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: As;
}

const variants = {
  hidden: { opacity: 0, y: 32 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
      delay,
    },
  }),
};

export function FadeUp({ children, delay = 0, className, as = "div" }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const Component = motion[as];
  return (
    <Component
      ref={ref as never}
      className={className}
      variants={variants as any}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      custom={delay}
    >
      {children}
    </Component>
  );
}
