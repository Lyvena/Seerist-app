"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Package, Check } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import { insforgeBrowser } from "@/lib/insforge/client"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"

interface Product {
  id: string
  name: string
  is_active: boolean
}

interface ProductSwitcherProps {
  currentProductId?: string
  onProductChange?: (productId: string) => void
}

export function ProductSwitcher({ currentProductId, onProductChange }: ProductSwitcherProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    if (!user?.id) return
    insforgeBrowser().database
      .from("products")
      .select("id, name, is_active")
      .eq("user_id", user.id)
      .order("is_active", { ascending: false })
      .then(({ data }) => setProducts((data ?? []) as Product[]))
  }, [user?.id])

  const currentProduct = products.find((p) => p.id === currentProductId) ?? products[0]

  async function handleSelect(product: Product) {
    setOpen(false)
    if (onProductChange) {
      onProductChange(product.id)
    } else {
      router.push(`/opportunities?product=${product.id}`)
    }
  }

  if (products.length <= 1) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-lg bg-[var(--surface-elevated)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--sidebar-bg-elevated)] transition-colors w-full"
          aria-label="Switch product"
        >
          <Package className="h-4 w-4 text-[var(--sidebar-fg-secondary)]" />
          <span className="flex-1 truncate text-left">{currentProduct?.name ?? "Select product"}</span>
          <ChevronDown className="h-3.5 w-3.5 text-[var(--sidebar-fg-muted)]" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-[232px] p-1">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => handleSelect(product)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface-tertiary)]"
          >
            <Package className="h-4 w-4 text-[var(--text-muted)]" />
            <span className="flex-1 truncate text-[var(--text-primary)]">{product.name}</span>
            {product.id === currentProductId && <Check className="h-3.5 w-3.5 text-[var(--brand-primary)]" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
