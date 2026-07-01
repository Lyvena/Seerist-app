import { PageHeader } from "@/components/common/PageHeader"
import { ComingSoon } from "@/components/common/ComingSoon"
import { Trophy } from "lucide-react"

export default function WonDealsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Won Deals" subtitle="Track revenue from opportunities you've closed" />
      <ComingSoon
        icon={Trophy}
        title="Your closed wins, all in one place"
        description="Once you mark opportunities as won, this page becomes your revenue dashboard — showing deal value, win rate, and trends over time."
        features={[
          { label: "Revenue totals", description: "See total closed-won value across all platforms and products at a glance." },
          { label: "Win rate trends", description: "Track how your proposal-to-close ratio changes week over week." },
          { label: "Deal history", description: "A timeline of every won deal with the platform, value, and time-to-close." },
        ]}
      />
    </div>
  )
}
