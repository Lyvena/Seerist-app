"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

const STORAGE_KEY = "seerist-dismissed-announcement";

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
          initial={{ height: 44, opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-50 overflow-hidden"
          style={{
            background: "linear-gradient(90deg, #635BFF 0%, #8B5CF6 50%, #00C2A8 100%)",
          }}
        >
          <div className="flex h-11 items-center justify-center gap-2 px-4 text-sm text-white">
            <span className="hidden sm:inline">✨</span>
            <span className="text-center text-[0.8125rem] sm:text-sm">
              AI Business Development for SaaS — Now in Public Beta
            </span>
            <Link
              href="https://app.seerist.xyz/signup"
              className="ml-1 inline-flex items-center gap-1 text-[0.8125rem] sm:text-xs font-semibold underline decoration-white/50 underline-offset-4 hover:decoration-white transition-colors"
            >
              Try it free <ArrowRight className="w-3 h-3" />
            </Link>
            <button
              onClick={dismiss}
              className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-white/70 hover:bg-white/15 hover:text-white transition-colors"
              aria-label="Dismiss announcement"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
