# InsForge Client Integration

## Environment Variables

Required in `.env.local` (never commit):

```
# Public (exposed to browser)
NEXT_PUBLIC_INSFORGE_URL=https://x69u73wi.eu-central.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=your-anon-key

# Private (server-side only)
INSFORGE_URL=https://x69u73wi.eu-central.insforge.app
INSFORGE_API_KEY=your-project-api-key
```

## Client Types

### Server Admin Client (`src/lib/insforge/client.ts`)
- `insforgeAdmin` — Full-privilege access for Server Actions
- Use for: mutations, bypassing RLS, bulk operations

### Server Client (per-request)
- `getServerClient()` — Creates authenticated client per request
- Use for: reads in Server Components, respecting RLS

### Browser Client
- `insforgeBrowser` — User-authenticated client for browser
- Use for: client components, realtime subscriptions

## Usage Patterns

### Server Actions (mutations)
```typescript
// src/app/actions/products.ts
"use server"

import { insforgeAdmin } from "@/lib/insforge/client"
import { requireUser } from "@/lib/auth"

export async function createProduct(formData: FormData) {
  const userId = await requireUser()
  const { data, error } = await insforgeAdmin.database
    .from("products")
    .insert([{ ...parseInput(formData), user_id: userId }])
    .select("id")
    .single()
  return { id: data?.id, error: error?.message ?? null }
}
```

### Server Components (reads with RLS)
```typescript
// src/app/(protected)/products/page.tsx
import { getServerClient } from "@/lib/insforge/client"

export default async function ProductsPage() {
  const insforge = await getServerClient()
  const { data: products } = await insforge.database
    .from("products")
    .select("*")
  return <ProductsClient products={products ?? []} />
}
```

### Client Components (reads + realtime)
```typescript
// src/components/SomeClient.tsx
"use client"

import { insforgeBrowser } from "@/lib/insforge/client"

export function SomeClient({ userId }: { userId: string }) {
  useEffect(() => {
    insforgeBrowser.realtime.connect()
      .then(() => insforgeBrowser.realtime.subscribe(`opportunities:${userId}`))
      .then(() => {
        insforgeBrowser.realtime.on("new_opportunity", (msg) => {
          // handle new opportunity
        })
      })
  }, [userId])
  // ...
}
```

### Data Layer (typed CRUD)
```typescript
// src/lib/db/index.ts
import { getProducts, createProduct, getOpportunities } from "@/lib/db"

// Get all user's products
const products = await getProducts(userId)

// Create new product
const { id, error } = await createProduct({ ...input })

// Get opportunities with filters
const { data, count } = await getOpportunities(userId, {
  status: ["new", "viewed"],
  minScore: 60,
  limit: 20,
})
```

### Error Handling
```typescript
// All db functions throw on error - wrap in try/catch
try {
  const products = await getProducts(userId)
  return { products, error: null }
} catch (err) {
  return { products: [], error: getErrorMessage(err) }
}
```

### Loading States
- Use Next.js loading.tsx in route folders
- Use React Suspense for async components
- Use `useTransition` for client mutations