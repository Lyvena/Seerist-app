---
# Seerist Website — CLAUDE.md

## What This Project Is
The Seerist marketing website at seerist.xyz. A standalone Next.js 15 project
with no backend, no database, and no authentication. It is purely frontend.
All CTAs link to https://app.seerist.xyz.

## Key Rules
- NO InsForge Auth, database, or Edge Functions in this project
- NO dark mode — the site is always light
- NO shadcn/ui components that require a backend (no form submit → DB)
- ALL animations use Framer Motion OR GSAP, never both on the same element
- Use Framer Motion for component-level micro-animations and transitions
- Use GSAP + ScrollTrigger for scroll-driven timeline animations
- Use Lenis for smooth scroll — initialized once in a client SmoothScroll component
- Images: use next/image always, never <img>
- Fonts: --font-cal (Cal Sans) for headings h1/h2, Geist Sans for body

## Stack
- Next.js 15 App Router
- TypeScript strict
- Tailwind CSS v4
- Framer Motion (micro-animations)
- GSAP + ScrollTrigger (scroll animations)
- Lenis (smooth scroll)
- Cal Sans (headings) + Geist Sans (body) + Geist Mono (code/numbers)

## App Links
- Sign up: https://app.seerist.xyz/signup
- Sign in: https://app.seerist.xyz/login
- Dashboard: https://app.seerist.xyz/dashboard

## Project Structure
src/app/                    — pages
src/app/(pages)/            — all website pages
src/components/             — shared components
src/components/animations/  — reusable animation wrappers
src/components/mockups/     — interactive app mockup components
src/components/sections/    — full page section components
src/components/ui/          — shadcn primitives (do not modify)
src/lib/                    — utilities
public/fonts/               — Cal Sans + other self-hosted fonts
public/images/              — static graphics and illustrations
