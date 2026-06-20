"use client"

import { useState, useEffect } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { upsertProduct } from "@/app/actions/products"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  description: string
  url: string | null
  category: string | null
  target_customer: string | null
  key_benefits: string[]
  pricing_model: string | null
  price_point: string | null
  keywords: string[]
  anti_keywords: string[]
  is_active: boolean
  created_at: string
}

interface ProductFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  userId: string
}

export function ProductFormModal({ open, onOpenChange, product, userId }: ProductFormModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [targetCustomer, setTargetCustomer] = useState("")
  const [keywords, setKeywords] = useState("")
  const [antiKeywords, setAntiKeywords] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (product) {
      setName(product.name)
      setDescription(product.description)
      setCategory(product.category ?? "")
      setTargetCustomer(product.target_customer ?? "")
      setKeywords(product.keywords?.join(", ") ?? "")
      setAntiKeywords(product.anti_keywords?.join(", ") ?? "")
    } else {
      setName("")
      setDescription("")
      setCategory("")
      setTargetCustomer("")
      setKeywords("")
      setAntiKeywords("")
    }
  }, [product, open])

  async function handleSave() {
    if (!name.trim() || !description.trim()) return
    setSaving(true)

    const { error } = await upsertProduct({
      id: product?.id,
      name: name.trim(),
      description: description.trim(),
      category: category.trim() || undefined,
      target_customer: targetCustomer.trim() || undefined,
      keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
      anti_keywords: antiKeywords.split(",").map((k) => k.trim()).filter(Boolean),
    })

    setSaving(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(product ? "Product updated" : "Product created")
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/20" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-0 shadow-drawer scrollbar-thin">
          <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{product ? "Edit Product" : "Add Product"}</h2>
            <Dialog.Close asChild>
              <button className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-tertiary)]">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Product Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]" placeholder="e.g. My SaaS Tool" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Description *</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="h-20 w-full resize-none rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]" placeholder="What does your product do?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Category</label>
                <input value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]" placeholder="e.g. Analytics" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Target Customer</label>
                <input value={targetCustomer} onChange={(e) => setTargetCustomer(e.target.value)} className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]" placeholder="e.g. Startup founders" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Keywords (comma-separated)</label>
              <input value={keywords} onChange={(e) => setKeywords(e.target.value)} className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]" placeholder="react, dashboard, saas, api" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Anti-Keywords (comma-separated, to exclude)</label>
              <input value={antiKeywords} onChange={(e) => setAntiKeywords(e.target.value)} className="w-full rounded-lg border border-[var(--border-primary)] bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]" placeholder="wordpress, php, html" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--border-primary)] px-5 py-3">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="default" size="sm" className="gap-1" onClick={handleSave} disabled={saving || !name.trim() || !description.trim()}>
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save Product"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
