"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Download, Trash2, Loader2 } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { Button } from "@/components/ui/button"
import { exportUserData, deleteAccount } from "@/app/actions/settings"
import { toast } from "sonner"

export default function DangerZoneClient() {
  const router = useRouter()
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")

  async function handleExport() {
    setExporting(true)
    const result = await exportUserData()
    if (result.success && result.url) {
      window.open(result.url, "_blank")
      toast.success("Export ready — download should start shortly")
    } else {
      toast.error(result.error ?? "Export failed")
    }
    setExporting(false)
  }

  async function handleDelete() {
    if (deleteConfirm !== "DELETE") return
    setDeleting(true)
    const result = await deleteAccount()
    if (result.success) {
      toast.success("Account deleted. Redirecting...")
      setTimeout(() => { window.location.href = "/" }, 1500)
    } else {
      toast.error(result.error ?? "Failed to delete account")
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Danger Zone" subtitle="Irreversible actions. Proceed with caution." />

      <div className="rounded-xl border border-red-500/20 bg-[var(--surface-primary)] p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10">
            <Download className="h-5 w-5 text-red-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Export All Data</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Download a JSON file containing all your products, opportunities, proposals, pipeline entries, and activity log.
            </p>
            <div className="mt-4">
              <Button variant="outline" onClick={handleExport} disabled={exporting}>
                {exporting ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Preparing...</> : <><Download className="mr-1 h-4 w-4" /> Export Data</>}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-red-500/20 bg-[var(--surface-primary)] p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Delete Account</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <div className="mt-4 space-y-3">
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder='Type "DELETE" to confirm'
                className="w-full max-w-xs rounded-lg border border-red-500/30 bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-red-500 focus:outline-none"
              />
              <div>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteConfirm !== "DELETE" || deleting}
                >
                  {deleting ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Deleting...</> : <><Trash2 className="mr-1 h-4 w-4" /> Delete Account</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
