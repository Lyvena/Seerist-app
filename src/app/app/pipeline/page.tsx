import { PageHeader } from "@/components/common/PageHeader"
import { EmptyState } from "@/components/common/EmptyState"
import { KanbanSquare } from "lucide-react"

export default function PipelinePage() {
  return (
    <div className="space-y-6">
      <PageHeader title="My Pipeline" subtitle="Track proposals from sent to won" />
      <EmptyState
        icon={KanbanSquare}
        title="Pipeline coming soon"
        description="Drag-and-drop kanban board for managing your proposal pipeline."
      />
    </div>
  )
}
