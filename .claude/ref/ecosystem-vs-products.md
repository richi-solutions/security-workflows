# Richi Portfolio Taxonomy

**Version:** 1.0
**Status:** ACTIVE

---

## Overview

Richi maintains two categories of software projects. Understanding which
category a repo belongs to is critical for making correct architectural
decisions — especially around authentication, database, billing, and branding.

---

## Category 1: Ecosystem Tools

Internal tools that serve the Richi brand. They share infrastructure,
have no independent revenue, and cannot be sold separately.

| Tool | Repo | Subdomain | Purpose |
|------|------|-----------|---------|
| **Richi Hub** | `richi.richi.solutions` | `richi.solutions` | Landing page, SSO auth hub, ecosystem showcase |
| **Ventura** | `ventura.richi.solutions` | `ventura.richi.solutions` | Social network for digital builders |
| **Media** | `media.richi.solutions` | `media.richi.solutions` | Open-source AI media library (MIT) |

### Characteristics

- **Supabase:** Shared project (`mhhmihzgwqtjyrktpdxw`) — one DB for all tools
- **Auth:** SSO hub-and-spoke — Richi Hub is the auth provider, tools redirect there
- **Billing:** None — these are free community/brand tools
- **Domain:** `*.richi.solutions` subdomains (no independent domains)
- **Branding:** Richi-branded, part of the ecosystem identity
- **License:** Proprietary (except Media which is MIT)
- **Database:** Shared tables (`profiles`, `user_roles`, etc.) + product-prefixed tables (`platform_*`, `media_*`)

### Auth Flow (Cookie-Based Cross-Subdomain SSO)

```
User on ventura.richi.solutions clicks "Login"
  → Redirect to richi.solutions/:lang/auth?redirect=<origin>&product=Ventura
  → User authenticates on Richi Hub
  → Supabase session stored as cookie (domain=.richi.solutions)
  → Redirect back to ventura.richi.solutions
  → Cookie is readable on the subdomain → session active
```

All Ecosystem Tools use `cookieStorage` instead of `localStorage` so that the
Supabase session is shared across all `*.richi.solutions` subdomains.

See `.claude/ref/generation/auth-and-sessions.md` for the full integration guide.

---

## Category 2: Independent Products

Standalone, monetizable products built by Richi. Each can operate independently
and is potentially exit-capable (sellable as a separate business).

| Product | Repo | Primary Domain | Subdomain (redirect) | Purpose |
|---------|------|---------------|----------------------|---------|
| **MovieMind** | `moviemind.richi.solutions` | `movie-mind.com` | `moviemind.richi.solutions` → redirect | AI-powered movie/TV tracking and recommendations |
| **Memobot** | `memobot.richi.solutions` | *(own domain)* | `memobot.richi.solutions` → redirect | AI chatbot builder with RAG pipeline |
| **Hookr** | `hookr.richi.solutions` | *(own domain)* | `hookr.richi.solutions` → redirect | AI content coaching for creators |

### Characteristics

- **Supabase:** Own project per product — fully isolated database and auth
- **Auth:** Own auth per product — no SSO with Richi Hub
- **Billing:** Stripe integration with tiered subscriptions (Free/Basic/Pro or similar)
- **Domain:** Own primary domain (e.g. `movie-mind.com`), `*.richi.solutions` subdomain redirects to it
- **Branding:** Independent brand, may show "by Richi" but not Richi-branded
- **License:** Proprietary
- **Database:** Own schema, own tables, own RLS policies — no shared tables with ecosystem

### Repo Naming Convention

All repos follow the pattern `<name>.richi.solutions` for internal consistency,
regardless of the public-facing domain. The subdomain `<name>.richi.solutions`
redirects to the product's primary domain.

---

## Decision Guide

When working in a repo, use this checklist to determine the correct approach:

| Question | Ecosystem Tool | Independent Product |
|----------|---------------|---------------------|
| Where does auth live? | SSO via Richi Hub | Own auth in the product |
| Which Supabase project? | Shared (`mhhmihzgwqtjyrktpdxw`) | Product's own project |
| Can I add tables to the shared DB? | Yes, with product prefix | No — use own DB |
| Should I add Stripe/billing? | No | Yes, if monetization planned |
| Does the user need a Richi account? | Yes | No |
| Can this be sold independently? | No | Yes |

---

## What Both Categories Share

Despite the operational differences, all projects share:

- **Consumer-Pro KB** — same architecture standards (Hexagonal, Error Envelope, Typed Config)
- **`.claude/` distribution** — same rules, agents, and skills from orchestrator
- **Tech stack** — React + Vite + TypeScript + Tailwind + shadcn/ui + Supabase
- **CI/CD** — GitHub Actions + Vercel Git Integration
- **Commit conventions** — Conventional Commits with mandatory body
- **i18n** — i18next with DE/EN/ES support
- **Code language** — English-only comments, variables, and commit messages
