#!/usr/bin/env bash
# Push orchestrator and sync .claude/ to all local repos if needed
#
# Usage: bash scripts/push-and-sync.sh
#
# Replaces: git push origin main
# Does:     git push + sync-local.sh (if .claude/ changed)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Push first
git push origin main

# Check if .claude/ files were in the latest commit(s)
CHANGED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -c "^\.claude/" || true)

if [ "$CHANGED" -gt 0 ]; then
  echo ""
  echo "=== .claude/ changes detected — syncing to local repos ==="
  echo ""
  bash "$SCRIPT_DIR/sync-local.sh"
else
  echo "No .claude/ changes — local sync skipped"
fi
