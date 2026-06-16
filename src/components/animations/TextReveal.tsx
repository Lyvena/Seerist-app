"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

type As = "h1" | "h2" | "h3" | "p" | "span";

interface Props {
  text: string;
  className?: string;
  as?: As;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const wordVariants = {
  hidden: { opacity: 0, y: "100%" },
  visible: {
    opacity: 1,
    y: "0%",
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
};

export function TextReveal({ text, className, as = "h2" }: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const words = text.split(" ");

  const Tag = motion[as];

  return (
    <Tag
      ref={ref as never}
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
    >
      {words.map((word, index) => (
        <span key={index} className="inline-block overflow-hidden align-bottom">
          <motion.span className="inline-block" variants={wordVariants as any}>
            {word}&nbsp;
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
