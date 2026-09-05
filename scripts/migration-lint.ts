/**
 * Lint de migrations (item 3d do handoff de 05/09/2026).
 *
 * Proíbe o padrão que causou o incidente do B0c: duas migrations criando a
 * MESMA tabela com `CREATE TABLE IF NOT EXISTS` e shapes diferentes.
 *
 * O `IF NOT EXISTS` transforma um conflito de design em silêncio: a segunda
 * definição vira no-op, o banco fica com o shape da primeira, o código passa a
 * escrever no shape da segunda, e o insert é rejeitado sem erro visível. Foi
 * assim que os alertas fiscais pararam de ser gravados por três meses e alguém
 * criou uma tabela de contorno direto em produção.
 *
 * Uso:
 *   npx tsx scripts/migration-lint.ts        (CI — sai com código 1 se falhar)
 * Também roda dentro da suíte Jest, então `npm test` já protege.
 */

import fs from "node:fs";
import path from "node:path";

export type TableDefinition = {
  table: string;
  file: string;
  columns: string[];
};

export type Violation = {
  table: string;
  definitions: Array<{ file: string; columns: string[] }>;
  colunasSoEm: Record<string, string[]>;
};

/**
 * Tabelas com colisão CONHECIDA e já endereçada. Entrar aqui exige a migration
 * de correção citada — não é lugar para silenciar problema novo.
 */
export const COLISOES_CONHECIDAS: Record<string, string> = {
  fiscal_alerts:
    "Colisao 028 (PT) x 133 (EN). Causa do B0c. Schema EN e o canonico; " +
    "migration 160 migra o historico da fiscal_notes_alerts_legacy.",
};

const PALAVRAS_DE_CONSTRAINT = new Set([
  "primary", "foreign", "unique", "check", "constraint", "exclude", "like", "index",
]);

/** Extrai os nomes de coluna do corpo de um CREATE TABLE. */
export function extractColumns(body: string): string[] {
  const cols: string[] = [];
  let depth = 0;
  let current = "";

  const flush = () => {
    const linha = current.trim().replace(/\s+/g, " ");
    current = "";
    if (!linha) return;
    const primeira = linha.split(/[\s(]/)[0].toLowerCase().replace(/"/g, "");
    if (!primeira || PALAVRAS_DE_CONSTRAINT.has(primeira)) return;
    cols.push(primeira);
  };

  for (const ch of body) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) { flush(); continue; }
    current += ch;
  }
  flush();
  return cols;
}

/** Encontra todas as definições de CREATE TABLE num arquivo SQL. */
export function parseCreateTables(sql: string, file: string): TableDefinition[] {
  // Ignora blocos DO $$ ... $$, onde CREATE TABLE aparece em texto dinâmico.
  const limpo = sql.replace(/DO\s*\$\$[\s\S]*?\$\$;/gi, "");

  const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?("?[\w]+"?)\s*\(([\s\S]*?)\n\s*\)\s*;/gi;
  const out: TableDefinition[] = [];
  let m: RegExpExecArray | null;

  while ((m = re.exec(limpo)) !== null) {
    out.push({
      table: m[1].replace(/"/g, "").toLowerCase(),
      file,
      columns: extractColumns(m[2]),
    });
  }
  return out;
}

/**
 * Detecta tabelas definidas em mais de uma migration com conjuntos de colunas
 * diferentes. Redefinição idêntica é inofensiva e não vira violação.
 */
export function findViolations(defs: TableDefinition[]): Violation[] {
  const porTabela = new Map<string, TableDefinition[]>();
  for (const d of defs) {
    const arr = porTabela.get(d.table) ?? [];
    arr.push(d);
    porTabela.set(d.table, arr);
  }

  const violations: Violation[] = [];

  for (const [table, definicoes] of porTabela) {
    if (definicoes.length < 2) continue;

    const assinaturas = new Set(definicoes.map(d => [...d.columns].sort().join(",")));
    if (assinaturas.size < 2) continue; // redefinição idêntica: inofensiva

    const colunasSoEm: Record<string, string[]> = {};
    for (const d of definicoes) {
      const outras = new Set(definicoes.filter(o => o !== d).flatMap(o => o.columns));
      const exclusivas = d.columns.filter(c => !outras.has(c));
      if (exclusivas.length > 0) colunasSoEm[d.file] = exclusivas;
    }

    violations.push({
      table,
      definitions: definicoes.map(d => ({ file: d.file, columns: d.columns })),
      colunasSoEm,
    });
  }

  return violations.sort((a, b) => a.table.localeCompare(b.table));
}

/** Roda o lint sobre o diretório de migrations. */
export function lintMigrations(dir = "supabase/migrations"): {
  violations: Violation[];
  novas: Violation[];
  conhecidas: Violation[];
} {
  const arquivos = fs.readdirSync(dir).filter(f => f.endsWith(".sql")).sort();
  const defs = arquivos.flatMap(f =>
    parseCreateTables(fs.readFileSync(path.join(dir, f), "utf8"), f),
  );
  const violations = findViolations(defs);
  return {
    violations,
    novas: violations.filter(v => !(v.table in COLISOES_CONHECIDAS)),
    conhecidas: violations.filter(v => v.table in COLISOES_CONHECIDAS),
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (require.main === module) {
  const { novas, conhecidas } = lintMigrations();

  for (const v of conhecidas) {
    console.log(`ℹ  ${v.table} — colisao conhecida: ${COLISOES_CONHECIDAS[v.table]}`);
  }

  if (novas.length === 0) {
    console.log("✓ migration-lint: nenhuma colisao nova de CREATE TABLE.");
    process.exit(0);
  }

  console.error("\n✗ migration-lint: CREATE TABLE duplicado com shape diferente.\n");
  for (const v of novas) {
    console.error(`  Tabela: ${v.table}`);
    for (const d of v.definitions) console.error(`    - ${d.file}  (${d.columns.length} colunas)`);
    for (const [file, cols] of Object.entries(v.colunasSoEm)) {
      console.error(`    colunas so em ${file}: ${cols.join(", ")}`);
    }
    console.error("");
  }
  console.error("Foi assim que os alertas fiscais pararam de ser gravados (B0c).");
  console.error("Corrija a definicao ou use ALTER TABLE na migration posterior.\n");
  process.exit(1);
}
