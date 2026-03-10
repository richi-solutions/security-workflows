---
name: update-dotclaude
description: Syncs shared .claude/ content from the orchestrator repo into the current project. Use after changes to the orchestrator's .claude/ template.
disable-model-invocation: true
allowed-tools: Bash
---

# Update .claude from Orchestrator

The orchestrator repo (`richi-solutions/orchestrator.richi.solutions`) is the single source of truth for shared `.claude/` content. This skill pulls the latest shared files into the current project.

## Automatic Distribution

The orchestrator runs `sync-dotclaude.yml` daily at 05:00 UTC and on every push to `.claude/**`. In most cases, your project is already up to date.

To trigger a manual sync for all repos: go to the orchestrator's Actions tab > "Sync .claude" > "Run workflow".

## Manual Update (this project only)

If you need to update this project immediately without waiting for the workflow:

```bash
# Download shared .claude/ content from orchestrator
OWNER="richi-solutions"
SOURCE_REPO="orchestrator.richi.solutions"
BRANCH="main"
SHARED_DIRS="agents rules ref skills sync"

for dir in $SHARED_DIRS; do
  rm -rf ".claude/${dir}"
  mkdir -p ".claude/${dir}"
  gh api "repos/${OWNER}/${SOURCE_REPO}/contents/.claude/${dir}?ref=${BRANCH}" \
    --jq '.[].download_url' | while read -r url; do
    # Handle nested directories by preserving path structure
    RELATIVE=$(echo "$url" | sed "s|.*/.claude/${dir}/||")
    DEST_DIR=".claude/${dir}/$(dirname "$RELATIVE")"
    mkdir -p "$DEST_DIR"
    curl -sL "$url" -o ".claude/${dir}/${RELATIVE}"
  done
done

# Also copy settings.json
gh api "repos/${OWNER}/${SOURCE_REPO}/contents/.claude/settings.json?ref=${BRANCH}" \
  --jq '.download_url' | xargs curl -sL -o .claude/settings.json
```

After downloading, sync config files to their required locations:

```bash
if [ -d ".claude/sync" ]; then
  cp -r .claude/sync/. .
fi
git add -A
git diff --cached --quiet || git commit -m "chore: sync .claude from orchestrator"
git push
```

## What gets synced (shared)

- `.claude/agents/` — agent definitions
- `.claude/rules/` — framework rules (Consumer-Pro KB, Runtime Contract)
- `.claude/ref/` — reference docs (loaded on demand)
- `.claude/skills/` — slash commands
- `.claude/sync/` — config files (mirror layout → repo root)
- `.claude/settings.json` — base permissions

## What stays local (project-specific)

- `.claude/CLAUDE.md` — project instructions
- `.claude/CLAUDE.local.md` — local overrides
- `.claude/settings.local.json` — local settings
- `.claude/.mcp.json` — MCP server config
- `.claude/reviews/` — audit logs
