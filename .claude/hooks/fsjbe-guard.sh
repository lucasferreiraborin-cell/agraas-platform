#!/usr/bin/env bash
# PostToolUse hook (Edit/Write/MultiEdit): grep de termos sensíveis
# em paths públicos. Exit 2 + stderr se houver match (não bloqueia).

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
[ ! -f "$FILE" ] && exit 0

# Normaliza para path relativo ao repo (com forward slashes)
REL="${FILE//\\//}"
REL="${REL#*agraas/}"

# Allowlist de paths públicos
PUBLIC=0
case "$REL" in
  app/page.tsx|app/layout.tsx) PUBLIC=1 ;;
  app/sobre/*|app/portos/*) PUBLIC=1 ;;
  app/components/Hero*|app/components/Sobre*|app/components/Portos*|app/components/CTA*|app/components/Journey*) PUBLIC=1 ;;
esac
[ "$PUBLIC" -eq 0 ] && exit 0

# Termos proibidos (case-insensitive)
HITS=$(grep -inE '\b(halal|jeddah|q2[[:space:]-]?2026|sif certificado|exportação confirmada|apto exportação|embarque jeddah)\b' "$FILE" 2>/dev/null)
HITS2=$(grep -inE 'cliente fundador.*em operação' "$FILE" 2>/dev/null)

if [ -n "$HITS" ] || [ -n "$HITS2" ]; then
  {
    echo "⚠️ FSJBE compliance — termos sensíveis em $REL:"
    [ -n "$HITS" ] && echo "$HITS"
    [ -n "$HITS2" ] && echo "$HITS2"
    echo ""
    echo "Memory project_fsjbe_reality.md: FSJBE é piloto MVP, fazenda de cria, SEM exportação confirmada. Não afirmar Halal/Jeddah/Q2 2026/SIF certificado/'apto exportação' no site público."
  } >&2
  exit 2
fi
exit 0
