#!/usr/bin/env bash
# Stop hook: alerta se houver mudanças não commitadas.
# Não bloqueia — só informa.

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

DIRTY=$(git status --porcelain 2>/dev/null | grep -v '^?? supabase/\.temp' | head -10)
if [ -n "$DIRTY" ]; then
  echo "📌 Mudanças não commitadas (memory feedback_auto_commit_push.md: auto-commit-push após cada etapa)"
  echo "$DIRTY"
  echo ""
  echo "Considere /checkpoint."
fi
exit 0
