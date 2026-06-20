import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { Cpu } from "lucide-react"

export default function AISettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="AI Settings" subtitle="Configure AI model preferences" />
      <EmptyState
        icon={Cpu}
        title="AI Settings coming soon"
        description="Choose your AI model, adjust generation parameters, and manage API usage."
      />
    </div>
  )
}
