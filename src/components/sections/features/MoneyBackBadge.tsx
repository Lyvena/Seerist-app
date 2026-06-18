"use client";
import { FadeUp } from "@/components/animations/FadeUp";
import { Shield } from "lucide-react";

export function MoneyBackBadge() {
  return (
    <FadeUp>
      <div
        className="mx-auto max-w-2xl rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5] px-6 py-5 text-center"
      >
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#A7F3D0]">
          <Shield className="h-5 w-5 text-[#059669]" />
        </div>
        <p className="text-[0.9375rem] font-semibold text-[#065F46]">
          14-Day Money-Back Guarantee · No questions asked · Cancel any time
        </p>
      </div>
    </FadeUp>
  );
}
