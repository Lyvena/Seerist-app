"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Package, BarChart3, Sparkles } from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { Button } from "@/components/ui/button"
import { ScoreBadge } from "@/components/common/ScoreBadge"
import { deleteProduct } from "@/app/actions/products"
import { ProductFormModal } from "./ProductFormModal"
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

interface ProductsClientProps {
  products: Product[]
  opportunityCounts: Record<string, number>
  plan: string
  userId: string
}

export function ProductsClient({ products, opportunityCounts, plan, userId }: ProductsClientProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const isPro = plan === "pro" || plan === "agency"

  async function handleDelete(productId: string) {
    const { error } = await deleteProduct(productId)
    if (error) toast.error("Failed to delete product")
    else toast.success("Product deleted")
  }

  function handleEdit(product: Product) {
    setEditingProduct(product)
    setFormOpen(true)
  }

  function handleAdd() {
    if (!isPro && products.length >= 1) {
      toast.error("Free plan allows only 1 product. Upgrade to Pro.")
      return
    }
    setEditingProduct(null)
    setFormOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My Products" subtitle="Manage your SaaS products for opportunity matching">
        <Button variant="default" size="sm" className="gap-1.5" onClick={handleAdd}>
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <div key={product.id} className="group relative rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-5 transition-shadow hover:shadow-card">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary-light)]">
                  <Package className="h-5 w-5 text-[var(--brand-primary)]" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">{product.name}</h3>
                  {product.category && (
                    <span className="inline-block rounded-md bg-[var(--surface-tertiary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] mt-0.5">{product.category}</span>
                  )}
                </div>
              </div>
            </div>

            <p className="mt-3 line-clamp-2 text-sm text-[var(--text-secondary)] leading-relaxed">{product.description}</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-[var(--surface-tertiary)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">{product.keywords?.length ?? 0} keywords</span>
              <span className="rounded-md bg-[var(--surface-tertiary)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">{product.anti_keywords?.length ?? 0} anti-keywords</span>
              <span className="rounded-md bg-[var(--status-info-light)] px-2 py-0.5 text-[11px] font-medium text-[var(--status-info)]">{opportunityCounts[product.id] ?? 0} matched</span>
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-[var(--border-primary)] pt-3">
              <Button variant="ghost" size="xs" className="gap-1 text-[var(--text-muted)]" onClick={() => handleEdit(product)}>
                <Pencil className="h-3 w-3" />
                Edit
              </Button>
              <Button variant="ghost" size="xs" className="gap-1 text-[var(--status-error)]" onClick={() => handleDelete(product.id)}>
                <Trash2 className="h-3 w-3" />
                Delete
              </Button>
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-tertiary)]">
              <Package className="h-6 w-6 text-[var(--text-muted)]" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">No products yet</h3>
            <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">
              Add your first product to start matching with opportunities.
            </p>
            <Button variant="default" size="sm" className="mt-4 gap-1.5" onClick={handleAdd}>
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        )}
      </div>

      <ProductFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
        userId={userId}
      />
    </div>
  )
}
