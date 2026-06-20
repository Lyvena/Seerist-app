import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { Trophy } from "lucide-react"

export default function WonDealsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Won Deals" subtitle="Opportunities you've successfully closed" />
      <EmptyState
        icon={Trophy}
        title="No won deals yet"
        description="Mark proposals as won to track your closed deals here."
      />
    </div>
  )
}
