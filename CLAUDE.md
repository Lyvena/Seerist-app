---
# Seerist — CLAUDE.md

## What This Project Is

Seerist is a production web application that analyzes SaaS products and finds freelance opportunities that need exactly what you've built. This is the **InsForge-native web app** (not a marketing site). All data flows through InsForge: Auth, Postgres database, Realtime subscriptions, and Edge Functions for AI operations.

**InsForge Project:** `x69u73wi` (eu-central)
**API Base:** `https://x69u73wi.eu-central.insforge.app`

## Key Rules

- **Light theme only** — `ThemeProvider` locked to `defaultTheme="light"`, `enableSystem={false}`
- **Cal Sans for headings**, Geist Sans for body text, Geist Mono for code/numbers
- **All CTAs and flows must connect to the real InsForge backend** — no mock data in production paths
- **Server Actions** use `@/lib/auth.ts` → `requireUser()` for authentication, `@/lib/insforge.ts` → `admin` for privileged writes
- **Browser client** uses `@/lib/insforge-browser.ts` → `insforge` for user-authenticated queries
- **Respect `prefers-reduced-motion` strictly** — check with `useReducedMotionPref()` before running decorative animations
- **Minimize decorative animations** in actual app screens — prioritize clarity, speed, information density, and daily usability

## Stack

- Next.js 16 App Router (with React 19 Server Components)
- TypeScript strict mode
- Tailwind CSS v4
- Framer Motion (component-level micro-animations)
- GSAP + ScrollTrigger (only when necessary for scroll-driven animations)
- Lenis (smooth scroll)
- @insforge/sdk (database CRUD, auth, realtime, storage)
- OpenRouter AI via InsForge Model Gateway (proposal generation, opportunity scoring)

## InsForge Integration

### Authentication
- Server: `createServerClient({ cookies: await cookies() })` in `@/lib/auth.ts`
- Browser: `createBrowserClient({ refreshUrl: "/api/auth/refresh" })` in `@/lib/insforge-browser.ts`
- Protected routes use `requireUser()` Server Action wrapper

### Database Patterns
- Uses `admin.database.from("table").insert([{ ... }])` (batch inserts are arrays)
- Reference users with `auth.users(id)` and `auth.uid()` in RLS policies
- Edge Functions receive `Authorization: Bearer <user_token>` header

### Realtime
- Connect with `insforge.realtime.connect()`, subscribe to channels like `opportunities:${userId}`
- Handle `new_opportunity` events for live feed updates

### Edge Functions
Located in `/functions/`:
- `score-opportunity` — AI-powered opportunity scoring (OpenRouter)
- `generate-proposal` — AI proposal generation
- `scrape-platform` — Platform scraping orchestration
- `monitor-orchestrator` — Background monitoring coordination
- `send-opportunity-alert` — Notification emails
- `send-digest` — Daily summary emails
- `payment-webhook` — Stripe webhook handler

## Project Structure

```
src/
├── app/
│   ├── (pages)/           — Public pages (landing, pricing, features)
│   ├── (auth)/            — Auth routes (login, signup, callback, forgot-password)
│   ├── (protected)/       — Authenticated app routes with dashboard layout
│   │   ├── layout.tsx     — Dashboard layout with Sidebar/TopBar
│   │   ├── dashboard/     — Main dashboard home
│   │   ├── opportunities/ — Opportunities list + filters
│   │   ├── live-feed/     — Real-time opportunity feed
│   │   ├── pipeline/      — Kanban pipeline view
│   │   ├── proposals/     — Proposal editor/list
│   │   ├── won-deals/     — Won deals history
│   │   ├── products/      — Product management
│   │   ├── platforms/     — Platform configuration
│   │   ├── analytics/     — Stats and charts
│   │   ├── proposal-generator/ — Batch proposal generation
│   │   ├── onboarding/    — First-time setup
│   │   └── settings/      — User settings (profile, billing, AI, alerts)
│   ├── actions/           — Server Actions for data mutations
│   │   ├── opportunities.ts
│   │   ├── products.ts
│   │   ├── auth.ts
│   │   └── ...
│   └── globals.css
├── components/
│   ├── layout/            — Sidebar, TopBar, MobileDrawer, NavItem
│   ├── animations/        — Reusable motion wrappers (FadeIn, FadeUp, SmoothScroll)
│   ├── common/            — StatCard, PageHeader, ScoreBadge, EmptyState
│   ├── mockups/           — Interactive prototype components (for reference)
│   ├── proposals/         — ProposalModal, generation UI
│   ├── opportunities/   — OpportunityCard, OpportunityList, FilterSidebar
│   ├── pipeline/          — PipelineKanban, PipelineCard
│   └── ui/                — shadcn primitives
├── lib/
│   ├── auth.ts            — Auth helpers and requireUser()
│   ├── insforge.ts        — Admin client for Server Actions
│   ├── insforge-browser.ts — User client for browser
│   ├── db/
│   │   └── index.ts       — Data access layer (CRUD + queries)
│   │   └── schemas.ts     — Zod schemas + TypeScript interfaces
│   ├── opportunities.ts   — Formatting helpers
│   ├── animations/gsap-trigger.ts — GSAP ScrollTrigger helper
│   └── utils.ts           — Tailwind utils
functions/                  — InsForge Edge Functions
```

## Design Tokens (CSS Variables)

Defined in `globals.css`:
- `--brand-primary` / `--brand-primary-light` — Primary action color
- `--surface-primary` / `--surface-secondary` / `--surface-tertiary` — Backgrounds
- `--text-primary` / `--text-secondary` / `--text-muted` — Text hierarchy
- `--border-primary` — Border color
- `--status-success` / `--status-warning` / `--status-error` — Status indicators
- `--sidebar-bg`, `--sidebar-fg`, `--sidebar-accent` — Sidebar colors

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run typecheck  # TypeScript strict check
npm run lint       # Next.js linter
npm run deploy     # Deploy to InsForge
```

## Routes

### Public
- `/login` — Auth (email/password)
- `/signup` — Registration
- `/pricing` — Plans
- `/features`, `/how-it-works`, `/use-cases` — Marketing pages

### Protected (requires authentication)
- `/dashboard` — Main dashboard
- `/opportunities` — Opportunities list with filters
- `/live-feed` — Real-time opportunity stream
- `/pipeline` — Kanban view
- `/proposals` — Proposal management
- `/won-deals` — Won deals history
- `/products` — Product profiles
- `/platforms` — Platform configuration
- `/analytics` — Metrics and charts
- `/proposal-generator` — Batch generation
- `/onboarding` — First-time setup
- `/settings/*` — Profile, billing, AI, alerts, danger zone