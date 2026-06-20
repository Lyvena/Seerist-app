import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { Radio } from "lucide-react"

export default function LiveFeedPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Live Feed" subtitle="Real-time opportunities as they're posted" />
      <EmptyState
        icon={Radio}
        title="Live feed coming soon"
        description="Real-time streaming of new opportunities will appear here."
      />
    </div>
  )
}
