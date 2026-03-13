# orchestrator.richi.solutions

Cross-cutting automation orchestrator for the richi-solutions organization — schedules and executes AI-powered jobs across all projects.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Schedule & Jobs](#schedule--jobs)
- [Agent Prompts](#agent-prompts)
- [Reusable GitHub Actions](#reusable-github-actions)
- [Testing](#testing)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Contributing](#contributing)

---

## Overview

The orchestrator is a Node.js service that runs on Railway and executes scheduled AI jobs against all repositories in the `richi-solutions` GitHub organization. It uses Claude (Anthropic) as the AI backbone to perform security reviews, code audits, documentation checks, daily commit summaries, and social media content generation.

Jobs are defined in `schedule.yaml` and triggered either by the in-process cron scheduler or by GitHub Actions (`orchestrate-cron.yml`). Results are persisted to a Supabase database. The orchestrator also hosts a suite of reusable GitHub Actions workflows that are distributed to all org repos via the `sync-security.yml` workflow.

---

## Features

- **Sweep jobs** — runs an agent prompt against every discovered repo in parallel (max 3 concurrent)
- **Aggregate jobs** — collects data across all repos (e.g., all commits from the last 24 h) and runs one Claude call
- **Chain jobs** — waits for an upstream job to complete, then uses its output as input (polls for up to 30 min)
- **Provision jobs** — discovers repos with `has_testusers: true` in their project config (implementation pending)
- **GitHub-based repo discovery** — auto-discovers all `*.richi.solutions` repos, reads optional `.claude/project.yaml` per repo, caches results for 1 hour
- **Manual HTTP trigger** — `POST /api/trigger/:jobName` with API key auth for on-demand job execution
- **Structured result storage** — every job run written to Supabase `job_runs`; commit summaries and social content stored in dedicated tables
- **Social media pipeline** — `daily-commits` → `commits-to-social` chain generates platform-agnostic content pieces with components and platform mappings
- **Reusable GitHub Actions** — gitleaks secret scan, Semgrep SAST, OSV dependency scan, Supabase Security Advisor, DB audit — callable from any org repo
- **Security config distribution** — `sync-security.yml` auto-pushes the canonical `security.yml`, `.gitleaks.toml`, and `dependabot.yml` to all org repos
- **Claude-powered security audit** — `orchestrate-audit.yml` runs the Claude security-auditor agent in each repo and opens a fix PR if changes are needed

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js 22 / TypeScript 5.5 |
| **HTTP server** | Express 4 |
| **Scheduler** | node-cron 3 |
| **AI** | Anthropic Claude (`@anthropic-ai/sdk`) |
| **GitHub API** | Octokit REST (`@octokit/rest`) |
| **Database** | Supabase (PostgreSQL via `@supabase/supabase-js`) |
| **Validation** | Zod 3 |
| **Testing** | Vitest 4 |
| **Deployment** | Railway (Dockerfile) |
| **CI/CD** | GitHub Actions |

---

## Architecture

The service follows a Ports & Adapters (Hexagonal) pattern.

```
┌──────────────────────────────────────────────────────────┐
│                        server.ts                         │
│  Composition Root — wires adapters, handlers, scheduler  │
└────────────┬──────────────────────────────┬──────────────┘
             │                              │
     ┌───────▼────────┐           ┌─────────▼─────────┐
     │   Scheduler    │           │  Express Routes   │
     │  (node-cron)   │           │ /health /api/...  │
     └───────┬────────┘           └─────────┬─────────┘
             │                              │
             └──────────────┬───────────────┘
                            │
                   ┌────────▼────────┐
                   │    Executor     │
                   │ routes by type  │
                   └──┬──┬──┬──┬────┘
                      │  │  │  │
              ┌───────┘  │  │  └────────┐
              │          │  │           │
        ┌─────▼──┐  ┌────▼─┐ ┌──────┐ ┌▼─────────┐
        │ Sweep  │  │ Agg. │ │Chain │ │Provision │
        └──┬─────┘  └──┬───┘ └──┬───┘ └──┬───────┘
           │           │        │         │
           └───────────┴────────┴─────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
  ┌──────▼──────┐  ┌────────▼──────┐  ┌───────▼───────┐
  │  Discovery  │  │   GitHub      │  │    Claude     │
  │    Port     │  │    Port       │  │    Port       │
  └──────┬──────┘  └────────┬──────┘  └───────┬───────┘
         │                  │                  │
  ┌──────▼──────┐  ┌────────▼──────┐  ┌───────▼───────┐
  │  GitHub     │  │   GitHub      │  │    Claude     │
  │  Discovery  │  │   Adapter     │  │    Adapter    │
  │  Adapter    │  │  (Octokit)    │  │ (Anthropic)   │
  └─────────────┘  └───────────────┘  └───────────────┘
                                               │
                                      ┌────────▼───────┐
                                      │  Store Port    │
                                      └────────┬───────┘
                                               │
                                      ┌────────▼───────┐
                                      │  Supabase      │
                                      │  Store Adapter │
                                      └────────────────┘
```

All service operations return a `Result<T>` envelope (`{ ok: true, data }` or `{ ok: false, error: { code, message }, traceId }`). No raw exceptions are exposed at boundaries.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for full details.

---

## Getting Started

### Prerequisites

- Node.js 22+
- npm
- A Supabase project (apply migrations in `supabase/migrations/`)
- A GitHub PAT with `repo` read scope for the `richi-solutions` org
- An Anthropic API key

### Installation

```bash
git clone https://github.com/richi-solutions/orchestrator.richi.solutions.git
cd orchestrator.richi.solutions
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port (default: `3000`; Railway injects automatically) |
| `NODE_ENV` | `development` / `production` / `test` |
| `GITHUB_TOKEN` | GitHub PAT with `repo` read scope |
| `GITHUB_ORG` | GitHub org to discover repos from (default: `richi-solutions`) |
| `ANTHROPIC_API_KEY` | Anthropic API key (`sk-ant-...`) |
| `CLAUDE_MODEL` | Claude model ID (default: `claude-sonnet-4-6`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (full DB access) |
| `SERVICE_API_KEY` | API key for `X-API-Key` header on manual trigger endpoints |
| `SCHEDULE_PATH` | Path to `schedule.yaml` (default: `./schedule.yaml`) |
| `DISABLE_CRON` | Set to `true` to disable in-process cron (use when GitHub Actions triggers instead) |

### Apply Database Migrations

```bash
# Using Supabase CLI
supabase db push

# Or apply manually in the Supabase SQL editor:
# supabase/migrations/20260302000000_create_job_runs.sql
# supabase/migrations/20260307000000_create_result_tables.sql
# supabase/migrations/20260309000000_refactor_social_content.sql
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with ts-node (development) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled `dist/server.js` |
| `npm test` | Run all tests (single pass) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

---

## Project Structure

```
orchestrator.richi.solutions/
├── agents/                         # Claude agent system prompts (Markdown)
│   ├── code-reviewer.md
│   ├── commit-summarizer.md
│   ├── docs-checker.md
│   ├── security-reviewer.md
│   ├── social-media-writer.md
│   └── ux-analyst.md
├── src/
│   ├── server.ts                   # Composition root + Express app
│   ├── config/
│   │   ├── env.ts                  # Zod-validated environment loading
│   │   └── schedule.ts             # YAML schedule file loader
│   ├── contracts/v1/
│   │   ├── job-result.schema.ts    # JobResult Zod schema + types
│   │   └── schedule.schema.ts      # ScheduleConfig / JobDefinition schemas
│   ├── claude/
│   │   ├── claude.port.ts          # ClaudePort interface
│   │   └── claude.adapter.ts       # Anthropic SDK adapter (retry logic)
│   ├── discovery/
│   │   ├── discovery.port.ts       # DiscoveryPort interface
│   │   ├── github-discovery.adapter.ts  # Repo discovery with 1 h cache
│   │   └── types.ts                # RepoInfo type
│   ├── executor/
│   │   ├── executor.port.ts        # ExecutorPort interface
│   │   ├── executor.ts             # Routes jobs to handlers by type
│   │   └── handlers/
│   │       ├── sweep.handler.ts    # Fan-out: one Claude call per repo
│   │       ├── aggregate.handler.ts # Collect + summarize across repos
│   │       ├── chain.handler.ts    # Wait for dependency, then process
│   │       └── provision.handler.ts # Testuser sync (stub)
│   ├── github/
│   │   ├── github.port.ts          # GitHubPort interface
│   │   └── github.adapter.ts       # Octokit adapter
│   ├── lib/
│   │   ├── logger.ts               # Structured JSON logger
│   │   └── result.ts               # Result<T> type + helpers
│   ├── middleware/
│   │   └── auth.ts                 # X-API-Key middleware
│   ├── routes/
│   │   ├── health.ts               # GET /health
│   │   └── trigger.ts              # POST /api/trigger/:jobName, GET /api/jobs
│   ├── scheduler/
│   │   └── scheduler.ts            # node-cron wrapper
│   └── store/
│       ├── store.port.ts           # StorePort interface
│       └── supabase-store.adapter.ts  # Supabase persistence
├── .github/workflows/              # GitHub Actions (see below)
├── supabase/migrations/            # PostgreSQL migrations
├── docs/
│   ├── ARCHITECTURE.md
│   └── test-coverage.md
├── schedule.yaml                   # Job schedule definitions
├── Dockerfile                      # Production container (Node 22 Alpine)
└── railway.toml                    # Railway deployment config
```

---

## Schedule & Jobs

Jobs are defined in `schedule.yaml`. Each job requires a `cron` expression, a `type`, and an optional `agent` name (maps to a file in `agents/`).

```yaml
jobs:
  <job-name>:
    cron: "<cron expression>"
    type: sweep | aggregate | chain | provision
    agent: <agent-filename-without-.md>   # optional, defaults to job name
    depends_on: <other-job-name>          # chain jobs only
    targets: all | [{ key: value }]       # optional filter
    timeout_ms: 120000                    # optional, default 120000
```

### Active Jobs

| Job | Type | Schedule | Agent |
|-----|------|----------|-------|
| `security-scan` | sweep | Daily 02:00 UTC | `security-reviewer` |
| `code-review` | sweep | Weekly Sunday 03:00 UTC | `code-reviewer` |
| `docs-check` | sweep | Weekly Monday 04:00 UTC | `docs-checker` |
| `daily-commits` | aggregate | Daily 21:59 UTC | `commit-summarizer` |
| `commits-to-social` | chain | Daily 22:59 UTC | `social-media-writer` |
| `testuser-sync` | provision | Daily 06:00 UTC | — |

### Job Types

**`sweep`** — Discovers all repos, runs one Claude call per repo in parallel (max 3 concurrent). Results stored per-repo in `job_runs.results`.

**`aggregate`** — Collects structured data from all repos (currently: commits from the last 24 h), then runs a single Claude call with all data combined.

**`chain`** — Waits for a dependency job to complete today (polls every 1 min, timeout 30 min), then uses its output as Claude input. The `commits-to-social` job chains on `daily-commits`.

**`provision`** — Filters repos with `has_testusers: true` in `.claude/project.yaml` and provisions test users. Currently a stub pending project-specific implementation.

### Manual Trigger

```bash
# Trigger a job via HTTP
curl -X POST https://your-orchestrator-url/api/trigger/daily-commits \
  -H "X-API-Key: your-service-api-key"

# List all available jobs
curl https://your-orchestrator-url/api/jobs \
  -H "X-API-Key: your-service-api-key"

# Health check (no auth required)
curl https://your-orchestrator-url/health
```

---

## Agent Prompts

Agent prompts live in `agents/` as Markdown files. Each prompt is loaded at job execution time and passed as the system prompt to Claude.

| Agent | Purpose | Used by Job |
|-------|---------|-------------|
| `security-reviewer.md` | Audits repos for secrets, RLS gaps, missing auth, vulnerable deps | `security-scan` |
| `code-reviewer.md` | Reviews architecture, TypeScript quality, error handling, performance | `code-review` |
| `docs-checker.md` | Audits README, API docs, env setup, inline comments, type docs | `docs-check` |
| `docs-updater.md` | Generates/updates README, JSDoc, architecture docs, CONTRIBUTING | `orchestrate-docs.yml` |
| `commit-summarizer.md` | Summarizes daily commits into a human-readable report | `daily-commits` |
| `social-media-writer.md` | Converts commit summary to platform-agnostic social content JSON | `commits-to-social` |
| `ux-analyst.md` | Reviews frontend repos for accessibility, loading/error states, responsive design | (not scheduled; available for sweep jobs) |

To add a new agent: create `agents/<name>.md` and reference it in `schedule.yaml` via `agent: <name>`.

---

## Reusable GitHub Actions

These workflows are defined in `.github/workflows/` and callable from any repo in the org via `workflow_call`.

### `gitleaks.yml` — Secret Scanning

Scans the full git history for secrets using [gitleaks](https://github.com/gitleaks/gitleaks).

**Usage in a consumer repo:**
```yaml
jobs:
  gitleaks:
    uses: richi-solutions/orchestrator.richi.solutions/.github/workflows/gitleaks.yml@main
    secrets: inherit
```

**Inputs:** none
**Secrets:** `GITHUB_TOKEN` (automatic)

---

### `semgrep.yml` — SAST

Runs Semgrep with TypeScript, JavaScript, secrets, and OWASP Top 10 rulesets. Uploads results as SARIF.

**Usage:**
```yaml
jobs:
  semgrep:
    uses: richi-solutions/orchestrator.richi.solutions/.github/workflows/semgrep.yml@main
    secrets: inherit
```

**Inputs:** none
**Secrets:** `SEMGREP_APP_TOKEN` (optional, for Semgrep Cloud integration)

---

### `osv-scan.yml` — Dependency Vulnerability Scan

Runs [OSV-Scanner](https://github.com/google/osv-scanner) recursively on the repository.

**Usage:**
```yaml
jobs:
  osv-scan:
    uses: richi-solutions/orchestrator.richi.solutions/.github/workflows/osv-scan.yml@main
    secrets: inherit
```

**Inputs:** none

---

### `supabase-advisor.yml` — Supabase Security Advisor

Calls the Supabase Security Advisor API and creates/updates a GitHub issue if findings are detected.

**Usage:**
```yaml
jobs:
  supabase-advisor:
    uses: richi-solutions/orchestrator.richi.solutions/.github/workflows/supabase-advisor.yml@main
    secrets: inherit
    with:
      project-ref: ${{ vars.SUPABASE_PROJECT_REF }}
```

**Inputs:**
| Input | Required | Description |
|-------|----------|-------------|
| `project-ref` | yes | Supabase project reference ID |

**Secrets:** `SUPABASE_ACCESS_TOKEN`

---

### `supabase-db-audit.yml` — Database Security Audit

Connects via `psql` and runs a `security_audit()` function deployed in the target project's database. Creates a GitHub issue for critical findings.

**Usage:**
```yaml
jobs:
  db-audit:
    uses: richi-solutions/orchestrator.richi.solutions/.github/workflows/supabase-db-audit.yml@main
    with:
      project-ref: "your-project-ref"
      project-name: "your-project-name"
    secrets:
      db-password: ${{ secrets.YOUR_DB_PASSWORD }}
```

**Inputs:**
| Input | Required | Description |
|-------|----------|-------------|
| `project-ref` | yes | Supabase project reference ID |
| `project-name` | yes | Human-readable name (used in issue titles) |

**Secrets:** `db-password`

---

### `security.yml` — Composite Security Caller (distributed)

Calls all four reusable security workflows in a single file. This is the file distributed to all org repos by `sync-security.yml`.

**Usage:** this file is pushed automatically — no manual setup required.

---

### Orchestrator-Internal Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `orchestrate-cron.yml` | GitHub Actions schedule + `workflow_dispatch` | Maps cron expressions to job names and calls `POST /api/trigger/:jobName` |
| `orchestrate-audit.yml` | Weekly Monday 03:00 UTC + `workflow_dispatch` | Runs Claude security-auditor agent in each repo; opens a fix PR if changes are needed |
| `orchestrate-docs.yml` | Weekly Tuesday 05:00 UTC + `workflow_dispatch` | Runs Claude documentation agent in each repo; opens a PR with doc updates |
| `org-security-overview.yml` | Weekly Monday 03:30 UTC + `workflow_dispatch` | Runs all advisor/DB audit checks across all Supabase projects; updates a pinned dashboard issue |
| `sync-dotclaude.yml` | Push to `main` touching `.claude/**` + daily 05:00 UTC | Distributes shared `.claude/` content (agents, rules, ref, skills) to all org repos |

---

## Testing

42 unit tests across 8 test files. No integration tests (external I/O adapters are excluded).

```bash
npm test              # single run
npm run test:watch    # watch mode
npm run test:coverage # with coverage
```

See [`docs/test-coverage.md`](docs/test-coverage.md) for the full test matrix and coverage gap analysis.

---

## Deployment

The service is deployed on [Railway](https://railway.app) using the `Dockerfile`.

### Build

```bash
npm run build   # compiles TypeScript to dist/
```

### Container

```dockerfile
FROM node:22-alpine
# Compiles TypeScript, prunes dev dependencies
CMD ["node", "dist/server.js"]
```

### Railway Config (`railway.toml`)

- Health check: `GET /health`
- Health check timeout: 300 s
- Restart policy: on failure, max 3 retries

### Required Railway Secrets

Set all variables from `.env.example` as Railway environment variables. `PORT` is injected automatically by Railway.

### GitHub Actions Secrets (for workflow triggers)

| Secret | Used by | Description |
|--------|---------|-------------|
| `ORCHESTRATOR_URL` | `orchestrate-cron.yml` | Base URL of the deployed service |
| `ORCHESTRATOR_API_KEY` | `orchestrate-cron.yml` | `SERVICE_API_KEY` value |
| `ORG_PAT` | `orchestrate-audit.yml`, `orchestrate-docs.yml`, `sync-dotclaude.yml` | GitHub PAT with `repo` scope |
| `ANTHROPIC_API_KEY` | `orchestrate-audit.yml`, `orchestrate-docs.yml` | Anthropic API key |
| `SUPABASE_ACCESS_TOKEN` | `supabase-advisor.yml`, `org-security-overview.yml` | Supabase management API token |
| `MOVIEMIND_DB_PASSWORD` | `org-security-overview.yml` | DB password for moviemind project |
| `HOOKR_DB_PASSWORD` | `org-security-overview.yml` | DB password for hookr project |

---

## Documentation

| Document | Location |
|----------|----------|
| Architecture Overview | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| Test Coverage | [`docs/test-coverage.md`](docs/test-coverage.md) |
| Contributing Guide | [`CONTRIBUTING.md`](CONTRIBUTING.md) |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, commit conventions, and PR process.
