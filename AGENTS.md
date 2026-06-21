<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Seerist App — AGENTS.md

## InsForge Architecture

**Project:** Seerist (`x69u73wi`)
**Region:** eu-central
**Stack:** Next.js 16 + InsForge (Postgres, Auth, Realtime, Edge Functions, Model Gateway)

### Database Schema (key tables)
- `users` — InsForge auth.users managed by InsForge Auth
- `products` — User's SaaS product profiles
- `opportunities` — Scraped freelance opportunities with AI scores
- `proposals` — Generated proposals linked to opportunities
- `platforms` — Enabled scraping platforms
- `pipeline_entries` — Kanban pipeline state
- `profiles` — User profile settings (plan, AI preferences)
- `notifications` — In-app notification center

### RLS Policy Pattern
```sql
-- Example: users can only access their own products
create policy "users_own_products" on products
  for all using (auth.uid() = user_id);
```

## Route Structure

### Public Routes (`(pages)`, `(auth)`)
- `/login`, `/signup` — Authentication via InsForge Auth
- `/pricing`, `/features`, `/how-it-works` — Marketing pages

### Protected Routes (`(protected)`)
All routes use dashboard layout with Sidebar navigation:
- `/dashboard` — Stats overview, onboarding steps
- `/opportunities` — Table list with filters (status, score, platform, budget)
- `/live-feed` — Real-time opportunity stream with sound alerts
- `/pipeline` — Kanban drag-and-drop view
- `/proposals` — Proposal editor and history
- `/won-deals` — Won opportunities tracking
- `/products` — Product CRUD (max based on plan)
- `/platforms` — Platform enable/disable config
- `/analytics` — Charts: daily counts, score distribution, platform performance
- `/proposal-generator` — Batch AI proposal generation
- `/onboarding` — First-time product setup flow
- `/settings/*` — Profile, Billing, AI Settings, Alerts, Danger Zone

## Coding Standards

### Server Actions (`/src/app/actions/`)
- Always use `requireUser()` at the top to enforce auth
- Use `admin` client for privileged database operations
- Return `{ error: string | null }` for consistent error handling
- Never trust client data — validate before database writes

### Client Components (`/src/components/`)
- Use `insforge` browser client for user queries
- Subscribe to realtime channels on mount, unsubscribe on unmount
- Check `useReducedMotionPref()` before running decorative animations

### protected Layout (`/src/app/(protected)/layout.tsx`)
- Uses `Sidebar`, `TopBar`, `MobileDrawer` inside a flex container
- Main content in `main.flex-1.overflow-y-auto` with max-w-7xl container

### Edge Functions (`/functions/`)
- Receive user token via `Authorization: Bearer` header
- Use `createClient({ baseUrl: OSS_HOST, edgeFunctionToken: userToken })`
- Return JSON with CORS headers for browser invocation

### Animation Policy
- Framer Motion: Component transitions, hover states, page transitions
- GSAP: Scroll-triggered sections only (pricing page animations)
- Lenis: Initialize in `SmoothScroll` component (client-only)
- **Always respect `prefers-reduced-motion`** — wrap animations in conditional checks

### Styling
- Use CSS variables (`var(--surface-primary)`, `var(--brand-primary)`)
- Cal Sans for all headings (`font-cal`), Geist Sans for body
- `next/image` everywhere — no `<img>` tags
- Sidebar width: `--sidebar-width` (240px)

## Environment Variables

```
# .env.local (never commit)
NEXT_PUBLIC_INSFORGE_URL=https://x69u73wi.eu-central.insforge.app
NEXT_PUBLIC_INSFORGE_ANON_KEY=your-anon-key
INSFORGE_URL=https://x69u73wi.eu-central.insforge.app
INSFORGE_API_KEY=ik_bcb691209aa697be33ceb6c9bce0f5e6
OPENROUTER_API_KEY=sk-... (for Edge Functions via InsForge secrets)
```

## Key Patterns

### Realtime Subscription
```typescript
await insforge.realtime.connect()
const channel = `opportunities:${userId}`
await insforge.realtime.subscribe(channel)
insforge.realtime.on("new_opportunity", (msg) => { /* handle */ })
```

### Database Query with RLS
```typescript
// Returns only rows user has access to
const { data } = await insforge.database
  .from("products")
  .select("*")
```

### Server Action Pattern
```typescript
async function createProduct(input: ProductInput) {
  const userId = await requireUser()
  const { error } = await admin.database
    .from("products")
    .insert([{ ...input, user_id: userId }])
  return { error: error?.message ?? null }
}
```

### Root Redirect Logic
The root `/` route checks auth state and redirects:
- Logged in → `/dashboard`
- Not logged in → `/login`

## Auth Integration

### Files
- `/src/app/actions/auth.ts` — Server Actions for auth (signInWithEmail, signUpWithEmail, signOutAction, signInWithOAuth)
- `/src/components/auth/AuthProvider.tsx` — Client-side user context
- `/src/components/auth/UserMenu.tsx` — User dropdown menu with signout
- `/src/lib/auth.ts` — requireUser() for Server Actions, feature access checks

### Auth Provider
```typescript
// In protected layout
import { AuthProvider } from "@/components/auth/AuthProvider"

<AuthProvider>
  {children}
</AuthProvider>

// In components
import { useAuth } from "@/components/auth/AuthProvider"
const { user, profile, loading, signOut } = useAuth()
```

### Protected Routes
All routes in `(protected)/` automatically require auth via `requireUser()` in Server Actions. The AuthProvider provides user context to client components.

### Redirect After Signup
Users are redirected to `/onboarding` after email signup to add their first product.

## Data Layer (`/src/lib/db/`)

### Schemas (`/src/lib/db/schemas.ts`)
Zod schemas + TypeScript interfaces for all entities:
- `ProductSchema` — Product profiles with keywords, tone prefs, platform config
- `OpportunitySchema` — Freelance opportunities with AI scoring
- `ProposalSchema` — AI-generated proposals
- `PipelineEntrySchema` — Kanban board state
- `PlatformSchema` — Scraped platforms
- `ProfileSchema` — User settings and plan info
- `NotificationSchema` — In-app notifications
- `ActivityLogSchema` — Audit trail

### CRUD Functions
```typescript
// Products
getProducts(userId) → Product[]
getProduct(id, userId) → Product | null
createProduct(input) → { id, error }
updateProduct(id, userId, updates) → { error }
deleteProduct(id, userId) → { error }

// Opportunities
getOpportunities(userId, filters?) → { data, count }
getOpportunity(id, userId) → Opportunity | null
getHighScoreOpportunities(userId, threshold?) → Opportunity[]
updateOpportunityStatus(id, userId, status) → { error }

// Proposals
getProposals(userId) → Proposal[]
getProposal(id, userId) → Proposal | null
createProposal(input) → { id, error }
updateProposal(id, userId, updates) → { error }

// Pipeline
getPipeline(userId) → PipelineEntry[]
getPipelineByStage(userId, stage) → PipelineEntry[]
moveOpportunityToStage(opportunityId, userId, stage) → { error }

// Platforms & Profiles
getSupportedPlatforms() → Platform[]
getProfile(userId) → Profile | null
getNotifications(userId, limit?) → Notification[]
logActivity(input) → void
```

### SQL Migration
Located in `/functions/migrations/01-initial-schema.sql` — creates tables with RLS policies.