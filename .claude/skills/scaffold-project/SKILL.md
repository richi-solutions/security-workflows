---
name: scaffold-project
description: Scaffolds a new project with the full richi-solutions standard — Vite + React + TypeScript + Supabase + Tailwind + shadcn/ui + .claude config. Use /scaffold-project [name] to invoke.
disable-model-invocation: true
allowed-tools: Bash, Read, Write, Edit
argument-hint: "[project-name]"
---

# Scaffold New Project

Create a new project with all richi-solutions conventions pre-configured.

Project name: `$ARGUMENTS`

## Step 1: Validate

- Project name must be lowercase, hyphens only
- Target directory: `/c/richi-solutions/$ARGUMENTS`
- Verify directory does NOT already exist

If the directory exists, abort.

## Step 2: Create Vite Project

```bash
cd /c/richi-solutions
npm create vite@latest $ARGUMENTS -- --template react-ts
cd $ARGUMENTS
npm install
```

## Step 3: Install Core Dependencies

```bash
# UI
npm install tailwindcss @tailwindcss/vite
npm install -D @types/node

# Supabase
npm install @supabase/supabase-js

# Routing
npm install react-router-dom

# State & Data
npm install @tanstack/react-query

# Forms & Validation
npm install react-hook-form zod @hookform/resolvers

# UI Components (shadcn)
npx shadcn@latest init -y
```

## Step 4: Project Structure

Create the standard directory structure:

```
src/
  components/     # Shared UI components
  features/       # Feature modules (each with own components, hooks, types)
  hooks/          # Global custom hooks
  lib/            # Utilities, supabase client, constants
  types/          # Global TypeScript types
  routes/         # Route definitions
```

Create these directories:
```bash
mkdir -p src/components src/features src/hooks src/lib src/types src/routes
```

## Step 5: Supabase Client

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## Step 6: Environment Files

Create `.env.example`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Create `.env`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Step 7: Git Init & .claude Setup

```bash
git init
git add -A
git commit -m "feat: initial project scaffold"
```

Copy shared `.claude/` content from the orchestrator (source of truth):

```bash
OWNER="richi-solutions"
SOURCE_REPO="orchestrator.richi.solutions"
SHARED_DIRS="agents rules ref skills sync"

mkdir -p .claude
for dir in $SHARED_DIRS; do
  gh api "repos/${OWNER}/${SOURCE_REPO}/contents/.claude/${dir}?ref=main" \
    --jq '.[].download_url' | while read -r url; do
    RELATIVE=$(echo "$url" | sed "s|.*/.claude/${dir}/||")
    DEST_DIR=".claude/${dir}/$(dirname "$RELATIVE")"
    mkdir -p "$DEST_DIR"
    curl -sL "$url" -o ".claude/${dir}/${RELATIVE}"
  done
done

# Copy settings.json
gh api "repos/${OWNER}/${SOURCE_REPO}/contents/.claude/settings.json?ref=main" \
  --jq '.download_url' | xargs curl -sL -o .claude/settings.json
```

Create a project-specific `CLAUDE.md` for this project. Use the orchestrator's CLAUDE.md as a template but adapt the Tech Stack, Folder Structure, and project-specific instructions.

```bash
git add .claude/
git commit -m "chore: add .claude from orchestrator"
```

## Step 8: GitHub Repo

Create the GitHub repo and push:

```bash
git remote add origin https://github.com/richi-solutions/$ARGUMENTS.git
git push -u origin main
```

If the repo doesn't exist yet, instruct the user to create it on GitHub first.

## Step 9: Sync Config

Copy all standardized configs from `.claude/sync/` to their target locations:

```bash
if [ -d ".claude/sync" ]; then
  cp -r .claude/sync/. .
  git add .
  git commit -m "chore: sync config from .claude/sync"
fi
```

## Step 10: Summary

```
## Project Scaffolded: $ARGUMENTS

### Tech Stack
- Vite + React 19 + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (client configured)
- React Router + TanStack Query
- React Hook Form + Zod

### Structure
src/
  components/  — shared UI
  features/    — feature modules
  hooks/       — global hooks
  lib/         — supabase client, utils
  types/       — global types
  routes/      — route config

### .claude
- Copied from orchestrator.richi.solutions (source of truth)
- All agents, skills, rules, and synced config included
- Updates distributed automatically via sync-dotclaude.yml

### Next Steps
1. Fill in .env with Supabase credentials
2. Run `supabase init` if using local Supabase
3. Create your first feature with /new-feature
```
