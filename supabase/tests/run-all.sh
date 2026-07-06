#!/usr/bin/env bash
# =============================================================================
# supabase/tests/run-all.sh
# Sprint L · Roda toda a suíte pgTAP de triggers críticos.
#
# Uso:
#   export SUPABASE_DB_URL_SERVICE='postgresql://postgres:...@db.PROJECT_REF.supabase.co:5432/postgres'
#   bash supabase/tests/run-all.sh
#
# Ou em CI (com Supabase local):
#   export SUPABASE_DB_URL_SERVICE='postgresql://postgres:postgres@localhost:54322/postgres'
#   bash supabase/tests/run-all.sh
#
# CADA arquivo de teste roda em transaction (BEGIN ... ROLLBACK) — nenhum
# dado fica persistido. O setup (000_setup.sql) é idempotente: cria a
# extensão pgtap se ainda não existir e (re)define a fixture helper.
# =============================================================================
set -euo pipefail

TESTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -z "${SUPABASE_DB_URL_SERVICE:-}" ]]; then
  echo "ERRO: variavel SUPABASE_DB_URL_SERVICE nao definida." >&2
  echo "Exemplo: postgresql://postgres:senha@db.PROJECT_REF.supabase.co:5432/postgres" >&2
  exit 2
fi

PSQL_FLAGS=(--single-transaction --no-psqlrc --quiet --variable=ON_ERROR_STOP=1)
TOTAL_FAIL=0
RAN=0

# Setup (cria pgtap + fixture). NÃO em single-transaction porque CREATE EXTENSION
# precisa ficar persistido para os arquivos seguintes lerem pgtap.
echo "==> Setup: ${TESTS_DIR}/000_setup.sql"
psql "${SUPABASE_DB_URL_SERVICE}" --no-psqlrc --quiet --variable=ON_ERROR_STOP=1 \
  --file "${TESTS_DIR}/000_setup.sql"

shopt -s nullglob
for f in "${TESTS_DIR}"/trigger_*.sql; do
  RAN=$((RAN+1))
  echo "==> $(basename "$f")"
  if ! psql "${SUPABASE_DB_URL_SERVICE}" "${PSQL_FLAGS[@]}" --file "$f"; then
    echo "    FALHOU"
    TOTAL_FAIL=$((TOTAL_FAIL+1))
  fi
done

echo ""
echo "============================================================"
echo "pgTAP suite: ${RAN} arquivo(s) rodado(s), ${TOTAL_FAIL} arquivo(s) com falha"
echo "============================================================"

if [[ "${TOTAL_FAIL}" -gt 0 ]]; then
  exit 1
fi
