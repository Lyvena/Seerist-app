import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { FileText } from "lucide-react"

export default function ProposalGeneratorPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Proposal Generator" subtitle="Batch-generate proposals" />
      <EmptyState
        icon={FileText}
        title="Proposal generator coming soon"
        description="Generate proposals for multiple opportunities at once."
      />
    </div>
  )
}
