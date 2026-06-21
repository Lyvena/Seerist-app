import type { Metadata } from "next";
import { PricingClient } from "./PricingClient";

export const metadata: Metadata = {
  title: "Pricing — Seerist",
  description:
    "Free forever for 1 product, 5 platforms, 100 opportunities/month. Upgrade to Pro or Agency as you grow.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <PricingClient />
    </div>
  );
}
