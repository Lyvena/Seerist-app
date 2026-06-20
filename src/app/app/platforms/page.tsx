import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { Globe } from "lucide-react"

export default function PlatformsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Platforms" subtitle="Configure freelancing platforms" />
      <EmptyState
        icon={Globe}
        title="Platforms management coming soon"
        description="Enable, disable, and configure platforms for opportunity scanning."
      />
    </div>
  )
}
