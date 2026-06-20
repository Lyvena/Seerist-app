import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { Package } from "lucide-react"

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="My Products" subtitle="Manage your SaaS products" />
      <EmptyState
        icon={Package}
        title="Products management coming soon"
        description="View and edit your registered products here."
      />
    </div>
  )
}
