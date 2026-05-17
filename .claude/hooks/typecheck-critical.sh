#!/usr/bin/env bash
# PostToolUse hook (Edit/Write/MultiEdit): roda tsc --noEmit apenas
# quando arquivo editado está em path crítico, e filtra erros para
# reportar só os DAQUELE arquivo.

INPUT=$(cat)
FILE=$(node -e '
let raw = "";
process.stdin.on("data", c => raw += c);
process.stdin.on("end", () => {
  try { const j = JSON.parse(raw); process.stdout.write(j.tool_input?.file_path || ""); }
  catch(e) {}
});
' <<<"$INPUT")

[ -z "$FILE" ] && exit 0

# Só .ts/.tsx
case "$FILE" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

# Normaliza para path relativo
REL="${FILE//\\//}"
REL="${REL#*agraas/}"

# Filtra paths críticos
CRITICAL=0
case "$REL" in
  app/api/*|lib/*|app/components/*|supabase/functions/*) CRITICAL=1 ;;
esac
[ "$CRITICAL" -eq 0 ] && exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# Roda tsc no projeto e filtra apenas linhas com este arquivo
OUTPUT=$(npx --no-install tsc --noEmit --pretty false 2>&1 | grep -F "$REL" | head -20)

if [ -n "$OUTPUT" ]; then
  {
    echo "⚠️ Typecheck errors em $REL:"
    echo "$OUTPUT"
  } >&2
  exit 2
fi
exit 0
