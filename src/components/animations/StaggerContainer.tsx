"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

type As = "div" | "section" | "ul";

interface Props {
  children: React.ReactNode;
  className?: string;
  as?: As;
}

const containerVariants = {
  hidden: { transition: { staggerChildren: 0.08 } },
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

export function StaggerContainer({ children, className, as = "div" }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const Component = motion[as];
  return (
    <Component
      ref={ref as never}
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
    >
      {children}
    </Component>
  );
}
