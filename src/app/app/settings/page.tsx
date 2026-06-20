import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { Settings2 } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />
      <EmptyState
        icon={Settings2}
        title="Settings coming soon"
        description="Account settings, notifications, and billing will appear here."
      />
    </div>
  )
}
