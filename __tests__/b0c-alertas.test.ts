/**
 * Tests: B0c — canal canônico de alertas + lint de migrations.
 *
 * Dois riscos cobertos aqui:
 *  1. O de-para PT→EN. O CHECK da migration 133 só aceita info/warning/critical;
 *     mandar "critico" derruba o insert e o alerta some — que é exatamente o
 *     modo de falha que criou a fiscal_notes_alerts_legacy.
 *  2. A FK `fiscal_alerts.fiscal_invoice_id` → `fiscal_invoices`. Sem a nota na
 *     canônica, o insert de alerta viola a chave.
 */

import {
  mapSeverity,
  acaoSugerida,
  toCanonicalAlert,
  writeCanonicalAlerts,
  severidadesDesconhecidas,
  resetSeveridadesDesconhecidas,
  SEVERIDADE_DEFAULT,
  type LegacyAlert,
} from "@/lib/fiscal/alert-writer";
import {
  extractColumns,
  parseCreateTables,
  findViolations,
  lintMigrations,
  COLISOES_CONHECIDAS,
} from "@/scripts/migration-lint";
import { getFiscalWriteMode } from "@/lib/feature-flags";

const alerta = (over: Partial<LegacyAlert> = {}): LegacyAlert => ({
  note_id: "n1", client_id: "c1", tipo: "ncm_incorreto",
  descricao: 'Item "ADUBO": NCM "123" deve ter 8 digitos.', severidade: "critico", ...over,
});

function fakeDb(erro?: string) {
  const calls: unknown[] = [];
  const client = {
    from: () => ({
      insert: (payload: unknown) => {
        calls.push(payload);
        return Promise.resolve({ error: erro ? { message: erro } : null });
      },
    }),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { client: client as any, calls };
}

// ── Item 1: default da flag ─────────────────────────────────────────────────

describe("FISCAL_WRITE_MODE — default seguro", () => {
  const original = process.env.FISCAL_WRITE_MODE;
  afterEach(() => {
    if (original === undefined) delete process.env.FISCAL_WRITE_MODE;
    else process.env.FISCAL_WRITE_MODE = original;
  });

  it("sem variável de ambiente, o default é legacy — deploy sobe seguro", () => {
    delete process.env.FISCAL_WRITE_MODE;
    expect(getFiscalWriteMode()).toBe("legacy");
  });

  it("valor inválido cai em legacy, nunca em dual", () => {
    process.env.FISCAL_WRITE_MODE = "qualquer_coisa";
    expect(getFiscalWriteMode()).toBe("legacy");
  });

  it("dual e canonical exigem escolha explícita", () => {
    process.env.FISCAL_WRITE_MODE = "dual";
    expect(getFiscalWriteMode()).toBe("dual");
    process.env.FISCAL_WRITE_MODE = "CANONICAL";
    expect(getFiscalWriteMode()).toBe("canonical");
  });
});

// ── De-para de severidade ───────────────────────────────────────────────────

describe("mapSeverity — CHECK da migration 133", () => {
  it("mapeia as três severidades legadas", () => {
    expect(mapSeverity("critico")).toBe("critical");
    expect(mapSeverity("aviso")).toBe("warning");
    expect(mapSeverity("info")).toBe("info");
  });

  it("aceita a forma acentuada", () => {
    expect(mapSeverity("crítico")).toBe("critical");
  });

  it("nunca devolve valor fora do CHECK — é o que derrubava o insert", () => {
    const permitidos = new Set(["info", "warning", "critical"]);
    for (const v of ["critico", "aviso", "info", "", "xpto", null, undefined, "ALTO"]) {
      expect(permitidos.has(mapSeverity(v))).toBe(true);
    }
  });

  it("desconhecido cai em WARNING, não em info (ajuste 1 de 05/09)", () => {
    // Severidade fora do de-para é, por definição, algo que ainda não cobrimos.
    // Rebaixar para `info` a esconderia na interface.
    expect(mapSeverity("gravissimo")).toBe("warning");
    expect(SEVERIDADE_DEFAULT).toBe("warning");
  });

  it("conta e registra cada severidade desconhecida, para alimentar o de-para", () => {
    resetSeveridadesDesconhecidas();
    const spy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mapSeverity("gravissimo");
    mapSeverity("gravissimo");
    mapSeverity("urgentissimo");
    mapSeverity("");
    expect(severidadesDesconhecidas()).toEqual({ gravissimo: 2, urgentissimo: 1, "(vazio)": 1 });
    expect(spy).toHaveBeenCalledTimes(4);
    expect(spy.mock.calls[0][0]).toContain("severidade-mapa.yaml");
    spy.mockRestore();
    resetSeveridadesDesconhecidas();
  });

  it("severidade conhecida não entra no contador", () => {
    resetSeveridadesDesconhecidas();
    ["critico", "aviso", "info", "alto", "medio", "baixo"].forEach(mapSeverity);
    expect(severidadesDesconhecidas()).toEqual({});
  });
});

// ── Conversão do alerta ─────────────────────────────────────────────────────

describe("toCanonicalAlert", () => {
  it("renomeia todas as colunas do shape PT para o EN", () => {
    const c = toCanonicalAlert(alerta());
    expect(c.fiscal_invoice_id).toBe("n1");
    expect(c.alert_type).toBe("nfe.ncm_incorreto");
    expect(c.message).toContain("ADUBO");
    expect(c.severity).toBe("critical");
    expect(c.resolved).toBe(false);
  });

  it("não vaza nenhuma chave do schema PT", () => {
    const chaves = Object.keys(toCanonicalAlert(alerta()));
    for (const pt of ["note_id", "tipo", "descricao", "severidade", "resolvido"]) {
      expect(chaves).not.toContain(pt);
    }
  });

  it("preenche suggested_action, que não existe no legado", () => {
    expect(toCanonicalAlert(alerta()).suggested_action).toContain("Convênio ICMS 100/97");
    expect(acaoSugerida("ia_fiscal")).toContain("contador");
  });

  it("tipo sem ação mapeada fica nulo, não inventa texto", () => {
    expect(acaoSugerida("tipo_que_nao_existe")).toBeNull();
  });

  it("nenhuma ação sugerida promete recuperação de imposto", () => {
    for (const t of ["ncm_incorreto", "cfop_divergente", "valor_divergente", "ia_fiscal"]) {
      const txt = (acaoSugerida(t) ?? "").toLowerCase();
      expect(txt).not.toContain("você tem direito");
      expect(txt).not.toContain("recuperação tributária");
    }
  });
});

// ── Escrita, e a FK ─────────────────────────────────────────────────────────

describe("writeCanonicalAlerts", () => {
  it("grava os alertas convertidos", async () => {
    const { client, calls } = fakeDb();
    const res = await writeCanonicalAlerts(client, [alerta(), alerta({ tipo: "ia_fiscal" })], true);
    expect(res.ok).toBe(true);
    expect(res.written).toBe(2);
    expect((calls[0] as Array<Record<string, unknown>>)[0].alert_type).toBe("nfe.ncm_incorreto");
  });

  it("recusa quando a nota não está na canônica — a FK derrubaria o insert", async () => {
    const { client, calls } = fakeDb();
    const res = await writeCanonicalAlerts(client, [alerta()], false);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("FK");
    expect(calls).toHaveLength(0); // nem tenta
  });

  it("lista vazia é sucesso sem ida ao banco", async () => {
    const { client, calls } = fakeDb();
    expect(await writeCanonicalAlerts(client, [], true)).toEqual({ ok: true, written: 0 });
    expect(calls).toHaveLength(0);
  });

  it("NUNCA lança — alerta perdido é ruim, upload derrubado é pior", async () => {
    const { client } = fakeDb("violates check constraint");
    const res = await writeCanonicalAlerts(client, [alerta()], true);
    expect(res.ok).toBe(false);
    expect(res.error).toContain("check constraint");

    const boom = { from: () => { throw new Error("sem conexao"); } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((await writeCanonicalAlerts(boom as any, [alerta()], true)).ok).toBe(false);
  });
});

// ── Lint de migrations (item 3d) ────────────────────────────────────────────

describe("migration-lint — extração", () => {
  it("extrai colunas ignorando constraints", () => {
    const cols = extractColumns(`
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id uuid NOT NULL REFERENCES clients(id),
      severity text NOT NULL CHECK (severity = ANY (ARRAY['info','warning'])),
      CONSTRAINT uq_x UNIQUE (client_id),
      PRIMARY KEY (id)
    `);
    expect(cols).toEqual(["id", "client_id", "severity"]);
  });

  it("não se confunde com vírgula dentro de parênteses", () => {
    const cols = extractColumns(`a numeric(14,2), b text, c numeric(7,4)`);
    expect(cols).toEqual(["a", "b", "c"]);
  });

  it("acha CREATE TABLE com e sem IF NOT EXISTS e com prefixo public", () => {
    const defs = parseCreateTables(
      `CREATE TABLE foo (\n  a text\n);\nCREATE TABLE IF NOT EXISTS public.bar (\n  b text\n);`,
      "x.sql",
    );
    expect(defs.map(d => d.table)).toEqual(["foo", "bar"]);
  });

  it("ignora CREATE TABLE dentro de bloco DO $$ — é texto dinâmico", () => {
    const sql = `DO $$ BEGIN EXECUTE 'CREATE TABLE zz (\n a text\n);'; END $$;`;
    expect(parseCreateTables(sql, "x.sql")).toHaveLength(0);
  });
});

describe("migration-lint — detecção", () => {
  it("acusa a mesma tabela com shapes diferentes", () => {
    const v = findViolations([
      { table: "t", file: "a.sql", columns: ["id", "note_id", "tipo"] },
      { table: "t", file: "b.sql", columns: ["id", "fiscal_invoice_id", "alert_type"] },
    ]);
    expect(v).toHaveLength(1);
    expect(v[0].colunasSoEm["a.sql"]).toEqual(["note_id", "tipo"]);
    expect(v[0].colunasSoEm["b.sql"]).toEqual(["fiscal_invoice_id", "alert_type"]);
  });

  it("redefinição idêntica não é violação", () => {
    expect(findViolations([
      { table: "t", file: "a.sql", columns: ["id", "x"] },
      { table: "t", file: "b.sql", columns: ["x", "id"] },
    ])).toHaveLength(0);
  });

  it("tabela definida uma vez só nunca é violação", () => {
    expect(findViolations([{ table: "t", file: "a.sql", columns: ["id"] }])).toHaveLength(0);
  });
});

describe("migration-lint — repositório real", () => {
  const resultado = lintMigrations();

  it("NENHUMA colisão nova de CREATE TABLE nas migrations", () => {
    const msg = resultado.novas
      .map(v => `${v.table}: ${v.definitions.map(d => d.file).join(" x ")}`)
      .join("\n");
    expect(msg).toBe("");
  });

  it("detecta a colisão histórica de fiscal_alerts (028 PT x 133 EN)", () => {
    const fa = resultado.conhecidas.find(v => v.table === "fiscal_alerts");
    expect(fa).toBeDefined();
    expect(fa!.definitions.map(d => d.file).join(" ")).toMatch(/028.*133/);
    expect(COLISOES_CONHECIDAS.fiscal_alerts).toContain("160");
  });
});
