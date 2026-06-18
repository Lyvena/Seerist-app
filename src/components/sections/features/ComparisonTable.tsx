"use client";
import { FadeUp } from "@/components/animations/FadeUp";

type FeatureRow = {
  group: string;
  name: string;
  free: boolean | string;
  pro: boolean | string;
  agency: boolean | string;
};

const ROWS: FeatureRow[] = [
  { group: "Core Discovery", name: "Products monitored", free: "1", pro: "3", agency: "Unlimited" },
  { group: "Core Discovery", name: "Platforms", free: "5", pro: "14", agency: "14 + custom" },
  { group: "Core Discovery", name: "Opportunity limit", free: "100/mo", pro: "Unlimited", agency: "Unlimited" },
  { group: "Proposals", name: "AI proposals", free: "20/mo", pro: "100/mo", agency: "Unlimited" },
  { group: "Proposals", name: "Auto-propose", free: false, pro: true, agency: true },
  { group: "Proposals", name: "Tone selection", free: false, pro: true, agency: true },
  { group: "Proposals", name: "BYOK AI keys", free: false, pro: true, agency: true },
  { group: "Automation", name: "Email digests", free: "Daily", pro: "Custom", agency: "Custom" },
  { group: "Automation", name: "Real-time alerts", free: false, pro: true, agency: true },
  { group: "Automation", name: "Priority scanning", free: false, pro: true, agency: true },
  { group: "Reporting & Analytics", name: "Dashboard", free: false, pro: true, agency: true },
  { group: "Reporting & Analytics", name: "Score breakdown", free: true, pro: true, agency: true },
  { group: "Reporting & Analytics", name: "Revenue tracking", free: false, pro: true, agency: true },
  { group: "Support & Extras", name: "Support", free: "Community", pro: "Email", agency: "Priority <4h" },
  { group: "Support & Extras", name: "White-label exports", free: false, pro: false, agency: true },
  { group: "Support & Extras", name: "API access", free: false, pro: false, agency: "Coming soon" },
];

const PLAN_LABELS = ["Free", "Pro", "Agency"];

function CheckBadge({ value }: { value: boolean | string }) {
  if (typeof value === "string") {
    return <span className="text-[0.875rem] font-medium text-[#5E6B8A]">{value}</span>;
  }
  return value ? (
    <svg className="h-5 w-5 text-[#635BFF]" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="h-5 w-5 text-[#D1D7E5]" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

export function ComparisonTable() {
  const grouped = ROWS.reduce<Record<string, FeatureRow[]>>((acc, row) => {
    if (!acc[row.group]) acc[row.group] = [];
    acc[row.group].push(row);
    return acc;
  }, {});

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#EBEEF5] bg-white" style={{ boxShadow: "var(--shadow-md)" }}>
      <table className="w-full min-w-[640px] text-left">
        <thead>
          <tr className="border-b border-[#EBEEF5] bg-[#F4F6FB]">
            <th className="px-5 py-3.5 text-[0.8125rem] font-semibold text-[#0B1221]">Feature</th>
            {PLAN_LABELS.map((plan) => (
              <th key={plan} className="whitespace-nowrap px-5 py-3.5 text-center text-[0.8125rem] font-semibold text-[#0B1221]">
                {plan}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(grouped).map(([group, rows]) => (
            <tbody key={group}>
              <tr>
                <td className="px-5 pt-4 pb-2 text-[0.6875rem] font-semibold uppercase tracking-widest text-[#94A0BC]" colSpan={4}>
                  {group}
                </td>
              </tr>
              {rows.map((row, index) => (
                <tr key={row.name + index} className="border-b border-[#F4F6FB] last:border-0">
                  <td className="px-5 py-3 text-[0.875rem] text-[#5E6B8A]">{row.name}</td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex justify-center"><CheckBadge value={row.free} /></div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex justify-center"><CheckBadge value={row.pro} /></div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex justify-center"><CheckBadge value={row.agency} /></div>
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </tbody>
      </table>
    </div>
  );
}
