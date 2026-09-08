/**
 * Tests: A-1 e A-2 — role de contador no cadastro e intake.
 *
 * O que está protegido aqui:
 *
 *  1. Todo valor que `roleDoPerfil` produz precisa passar no CHECK do banco.
 *     Antes da migration 162 a constraint aceitava só admin/client/buyer/bank —
 *     um `role: "accountant"` seria REJEITADO pelo Postgres e o cadastro
 *     quebraria depois de o usuário já ter sido criado no auth.
 *  2. Todo valor precisa ser conhecido pelo `roleToPersona`. Uma role que ele
 *     não conhece cai no default `produtor`, e a pessoa que se cadastrou como
 *     contador vai parar num painel de rebanho vazio — sem erro nenhum.
 *
 * Os dois lados vêm de arquivos diferentes (SQL e TypeScript) e nada além
 * deste teste os mantém alinhados.
 */

import fs from "node:fs";
import { roleToPersona } from "@/lib/persona-themes";

// ── Espelho do que o cadastro faz (app/cadastro/page.tsx) ──────────────────
// Mantido aqui porque a página é "use client" e importa React/lucide; o objetivo
// é travar o CONTRATO de mapeamento, não renderizar a tela.
const PERFIL_PARA_ROLE: Record<string, string> = {
  fazendeiro:  "client",
  contador:    "accountant",
  frigorifico: "buyer",
};
const roleDoPerfil = (perfil: string) => PERFIL_PARA_ROLE[perfil] ?? "client";

const ROTA_POS_CADASTRO: Record<string, string> = {
  accountant: "/contador",
  buyer:      "/comprador",
};

/** Roles aceitas pelo CHECK, lidas da migration mais recente que o define. */
function rolesDoCheck(): string[] {
  const sql = fs.readFileSync("supabase/migrations/162_a1_role_contador_e_intake.sql", "utf8");
  const m = sql.match(/CHECK \(role IN \(([^)]+)\)\)/);
  if (!m) throw new Error("CHECK de role não encontrado na migration 162");
  return m[1].split(",").map(x => x.trim().replace(/'/g, ""));
}

// ── O contrato entre o cadastro e o banco ──────────────────────────────────

describe("roleDoPerfil × CHECK do banco", () => {
  const aceitas = rolesDoCheck();

  it("a migration 162 passou a aceitar accountant", () => {
    expect(aceitas).toContain("accountant");
  });

  it("não removeu nenhuma role que já existia", () => {
    for (const r of ["admin", "client", "buyer", "bank"]) expect(aceitas).toContain(r);
  });

  it("TODA role que o cadastro produz passa no CHECK", () => {
    for (const perfil of Object.keys(PERFIL_PARA_ROLE)) {
      const role = roleDoPerfil(perfil);
      expect({ perfil, role, aceita: aceitas.includes(role) })
        .toEqual({ perfil, role, aceita: true });
    }
  });

  it("o fallback também passa no CHECK", () => {
    expect(aceitas).toContain(roleDoPerfil("perfil_que_nao_existe"));
  });
});

// ── O contrato entre o cadastro e a resolução de persona ───────────────────

describe("roleDoPerfil × roleToPersona", () => {
  it("contador vira persona contador — não cai no default produtor", () => {
    expect(roleToPersona(roleDoPerfil("contador"))).toBe("contador");
  });

  it("fazendeiro vira produtor e frigorífico vira frigorifico", () => {
    expect(roleToPersona(roleDoPerfil("fazendeiro"))).toBe("produtor");
    expect(roleToPersona(roleDoPerfil("frigorifico"))).toBe("frigorifico");
  });

  it("nenhuma role produzida cai em produtor por acidente", () => {
    // Se um mapeamento novo for adicionado e o roleToPersona não conhecer o
    // valor, ele silenciosamente vira produtor. Este teste pega isso.
    for (const [perfil, role] of Object.entries(PERFIL_PARA_ROLE)) {
      const persona = roleToPersona(role);
      if (perfil !== "fazendeiro") {
        expect({ perfil, persona }).not.toEqual({ perfil, persona: "produtor" });
      }
    }
  });

  it("perfis sem persona própria entram como produtor DE PROPÓSITO", () => {
    // Exportador, fornecedor, parceiro e visitante não têm painel próprio.
    // Inventar uma role para eles levaria a um painel que não existe.
    for (const p of ["exportador", "fornecedor", "parceiro", "visitante"]) {
      expect(roleDoPerfil(p)).toBe("client");
      expect(roleToPersona(roleDoPerfil(p))).toBe("produtor");
    }
  });
});

// ── Destino pós-cadastro ───────────────────────────────────────────────────

describe("rota pós-cadastro", () => {
  it("contador cai em /contador, não no painel de rebanho vazio", () => {
    expect(ROTA_POS_CADASTRO[roleDoPerfil("contador")]).toBe("/contador");
  });

  it("frigorífico cai em /comprador", () => {
    expect(ROTA_POS_CADASTRO[roleDoPerfil("frigorifico")]).toBe("/comprador");
  });

  it("produtor cai no default", () => {
    expect(ROTA_POS_CADASTRO[roleDoPerfil("fazendeiro")]).toBeUndefined();
  });

  it("toda rota de destino aponta para uma persona que existe", () => {
    for (const role of Object.keys(ROTA_POS_CADASTRO)) {
      expect(roleToPersona(role)).not.toBe("produtor");
    }
  });
});

// ── A-2: o intake ──────────────────────────────────────────────────────────

describe("tabela de intake (A-2)", () => {
  const sql = fs.readFileSync("supabase/migrations/162_a1_role_contador_e_intake.sql", "utf8");

  it("guarda todos os campos que o passo 2 coleta e descartava", () => {
    for (const campo of ["farm_name", "uf", "rebanho_faixa", "especie", "company_name", "notes", "telefone"]) {
      expect(sql).toContain(campo);
    }
  });

  it("tem client_id e RLS — exigência do CLAUDE.md para toda tabela operacional", () => {
    expect(sql).toMatch(/client_id uuid NOT NULL REFERENCES public\.clients/);
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
    expect(sql).toMatch(/USING \(client_id = get_my_client_id\(\) OR is_admin\(\)\)/);
  });

  it("NÃO tem policy de UPDATE nem DELETE — intake é registro do que foi dito", () => {
    expect(sql).not.toMatch(/FOR UPDATE/);
    expect(sql).not.toMatch(/FOR DELETE/);
  });

  it("existe rollback e ele avisa do risco de derrubar contadores", () => {
    const down = fs.readFileSync("supabase/rollbacks/162_down.sql", "utf8");
    expect(down).toContain("clients_role_check");
    expect(down).toMatch(/accountant/);
    expect(down).toMatch(/reclassificad|Reclassificar/i);
  });
});
