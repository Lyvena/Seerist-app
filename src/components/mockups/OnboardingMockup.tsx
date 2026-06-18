"use client";
import { motion } from "framer-motion";
import { Typewriter } from "@/components/mockups/Typewriter";

export function OnboardingMockup() {
  return (
    <div className="rounded-2xl border border-[#EBEEF5] bg-white p-5" style={{ boxShadow: "var(--shadow-md)" }}>
      <div className="space-y-4">
        <div>
          <label className="text-[0.6875rem] font-semibold text-[#94A0BC] uppercase tracking-wider">Product name</label>
          <div className="mt-1 rounded-xl border border-[#EBEEF5] bg-[#F4F6FB] px-3 py-2 text-sm font-medium text-[#0B1221]">InvoicePad</div>
        </div>
        <div>
          <label className="text-[0.6875rem] font-semibold text-[#94A0BC] uppercase tracking-wider">Description</label>
          <div className="mt-1 rounded-xl border border-[#EBEEF5] bg-[#F4F6FB] px-3 py-2 text-sm text-[#2D3754]">
            <Typewriter
              text="InvoicePad is a modern invoicing and billing tool for freelance agencies. It handles recurring invoices, payment reminders, client portals, and revenue reporting."
              delay={32}
            />
          </div>
        </div>
        <div>
          <label className="text-[0.6875rem] font-semibold text-[#94A0BC] uppercase tracking-wider">Keywords</label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {["invoicing", "billing", "SaaS", "freelance"].map((keyword) => (
              <span key={keyword} className="rounded-full bg-[#EEEDFF] px-2.5 py-0.5 text-[0.6875rem] font-semibold text-[#635BFF]">{keyword}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5">
        <p className="text-[0.6875rem] text-[#94A0BC]">AI is learning your product...</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#EBEEF5]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#635BFF] to-[#8B5CF6]"
            animate={{ width: "100%" }}
            transition={{ duration: 2, ease: "linear" }}
          />
        </div>
      </div>
    </div>
  );
}
