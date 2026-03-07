# Project Instructions — Richi AI Consumer-Pro Framework

**"Lean Today. Limitless Tomorrow."**

This project follows the **Consumer-Pro Knowledge Base v2.0**.
Full reference: `rules/core/consumer-pro-kb.md`

---

## Authority Hierarchy

1. `rules/core/consumer-pro-kb.md` — ROOT AUTHORITY
2. `rules/runtime-contract.md` — RUNTIME AUTHORITY / DEPLOYMENT GATE
3. `ref/*` — Reference contracts (loaded on demand via `@.claude/ref/<path>`)

Higher authority overrides lower. If two rules conflict, the higher one wins.

---

## Core Invariants (Never Break These)

- **Contracts as Law** — All APIs/events typed and validated via Zod/JSON Schema
- **Ports & Adapters** — Isolate external I/O behind interfaces
- **Domain Purity** — Business logic has no side effects or I/O
- **Error Envelope Standard** — Every function returns `{ ok, data?, error? }`
- **Typed Config Loader** — One validated entry point for all environment vars
- **Versioned Events** — Track app events via stable schemas, no PII
- **English-Only Code Comments** — No exceptions
- **Commit Body Mandatory** — Every `feat`, `fix`, `refactor`, `test` commit includes a body describing what changed and why
- **Secrets via env vars only** — Never in repo or client code
- **RLS enforced** — Row Level Security on all user tables

---

## Tech Stack (Lovable / React Projects)

- **Frontend:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Routing:** React Router (SPA pattern with `pages/` folder)
- **Backend:** Supabase (Auth, Database, Edge Functions)
- **Validation:** Zod
- **Testing:** Vitest (unit), Playwright (E2E)
- **CI/CD:** GitHub Actions

---

## Folder Structure

```
src/
  pages/             # routes (React Router)
  components/        # presentation only
  features/
    [feature]/
      ui/
      service/
      model/
  domain/            # pure use-cases, no I/O
  ports/             # interfaces
  adapters/          # concrete implementations
  lib/               # config, logger, metrics, flags, api client
  i18n/
    locales/
  contracts/
    v1/
supabase/
  functions/
    _shared/
    [function-name]/
```

---

## Branch & Deployment Strategy

```
feature/*  →  PR  →  GitHub Actions (lint, typecheck, test, E2E)
                          ↓
main       →  Lovable Preview  (auto-sync = Abnahme/Staging)
                          ↓
Lovable "Publish"  →  Production  (manual gate)
```

---

## Development Workflow

- **Planning:** Lovable (Planning Mode only)
- **Implementation:** Claude Code (this environment)
- **Pull before working** if Lovable editor was used
- **feature branches** for all changes — never commit directly to main

---

## Rules Index

| Rule File | Purpose |
|-----------|---------|
| `rules/core/consumer-pro-kb.md` | Full framework reference (ROOT AUTHORITY) |
| `rules/runtime-contract.md` | Deployment gate — must pass before publish |
| `rules/index.md` | Reference map — on-demand files per task |

All specialized guides (UI/UX, Email, Analytics, Flutter, etc.) are in `.claude/ref/`.
Load them on demand: `@.claude/ref/<path>` — see `rules/index.md` for the full map.

**Mandatory:** When creating or modifying agents or skills, always load
`@.claude/ref/agent-skill-building.md` first. All agents/skills must pass the
quality checklist defined in that guide before commit.

---

## Deployment Gate

Before any production publish, verify `rules/runtime-contract.md` checklist:

- [ ] Contracts validated (Zod schemas on all API boundaries)
- [ ] Error envelope implemented
- [ ] Config loader validated
- [ ] Logger implemented
- [ ] Analytics emitting required events
- [ ] Legal pages present
- [ ] Secrets secure (no keys in repo)
- [ ] HTTPS enabled
- [ ] RLS enabled on all user tables
