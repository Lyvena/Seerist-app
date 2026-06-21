# Seerist

Seerist is an InsForge-native web application that analyzes your SaaS product and finds freelance opportunities that need exactly what you've built.

## Features

- **Opportunity Discovery** — Real-time monitoring of Upwork, Freelancer, and other platforms for projects matching your product
- **AI Scoring** — Each opportunity scored for relevance, budget fit, and timing
- **Proposal Generation** — AI-generated custom proposals ready to send
- **Pipeline Management** — Track opportunities from discovery to won deal via Kanban board
- **Live Feed** — Real-time opportunity stream with sound notifications

## Tech Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Backend:** [InsForge](https://insforge.dev) (Postgres, Auth, Realtime, Edge Functions, Model Gateway)
- **AI:** OpenRouter (GPT-4o-mini) via InsForge Model Gateway
- **Animations:** Framer Motion (micro-interactions), GSAP (scroll), Lenis (smooth scroll)

## Routes

### Public
- `/login`, `/signup` — Authentication
- `/pricing`, `/features`, `/how-it-works` — Marketing pages

### Protected (authenticated)
- `/dashboard` — Stats overview, onboarding steps
- `/opportunities` — Opportunities list with filters
- `/live-feed` — Real-time opportunity stream
- `/pipeline` — Kanban pipeline view
- `/proposals` — Proposal editor
- `/won-deals` — Closed deals history
- `/products` — Product management
- `/platforms` — Platform configuration
- `/analytics` — Metrics and charts
- `/proposal-generator` — Batch generation
- `/onboarding` — First-time setup
- `/settings/*` — Profile, Billing, AI, Alerts, Danger Zone

## InsForge Integration

- **Database:** `opportunities`, `products`, `proposals`, `platforms`, `pipeline_entries`, `profiles`, `notifications`
- **Auth:** Email/password authentication with protected routes
- **Realtime:** Live opportunity feed via WebSockets
- **Edge Functions:** AI scoring, proposal generation, platform scraping

## Getting Started

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Development

```bash
npm run typecheck  # TypeScript check
npm run lint       # Linter
npm run deploy     # Deploy to InsForge
```

## Project Structure

```
src/
├── app/
│   ├── (pages)/      — Public marketing pages
│   ├── (auth)/       — Auth routes (login, signup)
│   ├── (protected)/  — Protected app routes
│   └── actions/      — Server Actions
functions/              — InsForge Edge Functions
```