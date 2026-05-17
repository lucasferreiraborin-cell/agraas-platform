#!/usr/bin/env bash
# SessionStart hook: injeta git status + último commit + última migration
# como additionalContext silencioso para o Claude.

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

STATUS=$(git status -sb 2>/dev/null | head -12)
LAST=$(git log -1 --oneline 2>/dev/null)
MIG=$(ls supabase/migrations/*.sql 2>/dev/null | sort | tail -1 | xargs -I{} basename {})

CTX="=== contexto Agraas ===
git: $STATUS

último commit: $LAST
última migration: ${MIG:-(nenhuma encontrada)}"

node -e '
let ctx = "";
process.stdin.on("data", c => ctx += c);
process.stdin.on("end", () => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: ctx
    }
  }));
});
' <<<"$CTX"
