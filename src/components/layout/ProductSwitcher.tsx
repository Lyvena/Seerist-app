"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Package, Check } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"
import { insforgeBrowser } from "@/lib/insforge/client"

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
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user?.id) return
    insforgeBrowser().database
      .from("products")
      .select("id, name, is_active")
      .eq("user_id", user.id)
      .order("is_active", { ascending: false })
      .then(({ data }) => setProducts((data ?? []) as Product[]))
  }, [user?.id])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

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
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg bg-[var(--surface-secondary)] px-3 py-1.5 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-tertiary)] transition-colors"
        aria-label="Switch product"
      >
        <Package className="h-4 w-4 text-[var(--text-secondary)]" />
        <span className="max-w-[140px] truncate">{currentProduct?.name ?? "Select product"}</span>
        <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-[var(--border-primary)] bg-[var(--surface-primary)] p-1.5 shadow-lg z-50">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelect(product)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface-secondary)]"
            >
              <Package className="h-4 w-4 text-[var(--text-secondary)]" />
              <span className="flex-1 truncate">{product.name}</span>
              {product.id === currentProductId && <Check className="h-3.5 w-3.5 text-[var(--brand-primary)]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}