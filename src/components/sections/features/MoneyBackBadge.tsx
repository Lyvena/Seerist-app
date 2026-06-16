"use client";
import { motion } from "framer-motion";
import { FadeUp } from "@/components/animations/FadeUp";
import { Container } from "@/components/ui/Container";

export function MoneyBackBadge() {
  return (
    <FadeUp>
      <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5 text-center text-emerald-800">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-5 w-5 text-emerald-700" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <p className="text-base font-semibold">14-Day Money-Back Guarantee · No questions asked · Cancel any time</p>
      </div>
    </FadeUp>
  );
}
