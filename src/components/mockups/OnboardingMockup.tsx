"use client";
import { motion } from "framer-motion";
import { Typewriter } from "@/components/mockups/Typewriter";

export function OnboardingMockup() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-500">Product name</label>
          <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900">InvoicePad</div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Description</label>
          <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
            <Typewriter
              text="InvoicePad is a modern invoicing and billing tool for freelance agencies. It handles recurring invoices, payment reminders, client portals, and revenue reporting."
              delay={32}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500">Keywords</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {["invoicing", "billing", "SaaS", "freelance"].map((keyword) => (
              <span key={keyword} className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">{keyword}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5">
        <p className="text-xs text-gray-500">AI is learning your product...</p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <motion.div className="h-full rounded-full bg-violet-600" animate={{ width: "100%" }} transition={{ duration: 2, ease: "linear" }} />
        </div>
      </div>
    </div>
  );
}
