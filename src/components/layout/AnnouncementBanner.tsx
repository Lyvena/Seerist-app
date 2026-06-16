"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const STORAGE_KEY = "seerist-dismissed-announcement";

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function AnnouncementBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const dismissed = window.localStorage.getItem(STORAGE_KEY);
      if (!dismissed) setVisible(true);
    } catch {}
  }, []);

  const dismiss = () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, "true");
      } catch {}
    }
    setVisible(false);
  };

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="announcement"
          initial={{ height: 40, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-50 overflow-hidden"
          style={{
            background: "linear-gradient(90deg, #7C3AED, #6D28D9)",
          }}
        >
          <div className="flex h-10 items-center justify-center gap-3 px-4 text-sm text-white">
            <span className="hidden sm:inline">✨ New:</span>
            <span className="text-center">
              Auto-propose is here — proposals sent automatically when a match is found
            </span>
            <Link
              href="#"
              className="ml-2 inline-flex items-center gap-1 text-xs font-medium underline decoration-white/60 underline-offset-4 hover:decoration-white"
            >
              Learn more <span aria-hidden="true">→</span>
            </Link>
            <button
              onClick={dismiss}
              className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Dismiss announcement"
            >
              <CloseIcon />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
