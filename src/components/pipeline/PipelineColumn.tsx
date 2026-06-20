"use client"

import { useDroppable } from "@dnd-kit/core"
import { DollarSign } from "lucide-react"
import type { ReactNode } from "react"

interface PipelineColumnProps {
  stage: string
  label: string
  dotColor: string
  count: number
  totalValue: number
  children: ReactNode
}

export function PipelineColumn({ stage, label, dotColor, count, totalValue, children }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl border bg-[var(--surface-secondary)] transition-shadow ${
        isOver ? "border-[var(--brand-primary)] shadow-card" : "border-[var(--border-primary)]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
          <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">{label}</h3>
          <span className="shrink-0 rounded-md bg-[var(--surface-tertiary)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">{count}</span>
        </div>
        {totalValue > 0 && (
          <div className="flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)]">
            <DollarSign className="h-3 w-3" />
            {totalValue.toLocaleString()}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto p-3 scrollbar-thin" style={{ maxHeight: "calc(100vh - 320px)" }}>
        {children}
        {count === 0 && (
          <p className="py-8 text-center text-xs text-[var(--text-muted)]">Drop deals here</p>
        )}
      </div>
    </div>
  )
}
