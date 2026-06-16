import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface TypewriterProps {
  text: string;
  delay?: number;
}

export function Typewriter({ text, delay = 28 }: TypewriterProps) {
  const [displayed, setDisplayed] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= text.length) return;

    const id = window.setTimeout(() => {
      setDisplayed((prev) => prev + text[index]);
      setIndex((prev) => prev + 1);
    }, delay);

    return () => window.clearTimeout(id);
  }, [index, text, delay]);

  return (
    <span>
      {displayed}
      <motion.span
        className="ml-0.5 inline-block h-4 w-2 bg-gray-900 align-middle"
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.55, repeat: Infinity, repeatType: "reverse" }}
      />
    </span>
  );
}
