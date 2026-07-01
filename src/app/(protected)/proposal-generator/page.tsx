import { PageHeader } from "@/components/common/PageHeader"
import { ComingSoon } from "@/components/common/ComingSoon"
import { FileText } from "lucide-react"

export default function ProposalGeneratorPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Proposal Generator" subtitle="Batch-generate tailored proposals at scale" />
      <ComingSoon
        icon={FileText}
        title="Generate proposals for every matching opportunity"
        description="Select a batch of high-score opportunities and generate a tailored first-draft proposal for each in one run — tuned to your product's tone, pricing, and keywords."
        features={[
          { label: "Batch generation", description: "Pick dozens of opportunities and draft proposals for all of them in a single action." },
          { label: "Tone & length presets", description: "Apply your saved AI preferences — professional, concise, with or without pricing — across the batch." },
          { label: "Review & send queue", description: "Every draft lands in your Proposals inbox ready to review, tweak, and send in one click." },
        ]}
      />
    </div>
  )
}
