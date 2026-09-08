/**
 * Tests: B4 — o documento que o contador assina.
 *
 * Não testo layout nem renderização: testo as garantias de CONTEÚDO. Um
 * relatório fiscal com aparência de pronto, mas apoiado em regra não
 * verificada, é pior que nenhum — o contador assina e a responsabilidade
 * passa a ser dele.
 *
 * O `@react-pdf/renderer` v4 é ESM-only e o Jest do projeto roda em CJS, então
 * ele é mockado e a asserção é feita sobre a árvore de elementos. Isso cobre o
 * que importa aqui (o documento diz o que precisa dizer) e deixa de fora só a
 * aparência, que se confere abrindo `/api/export/itr-pdf`.
 */

// Primitivas do react-pdf viram passthrough. StyleSheet.create é identidade.
jest.mock("@react-pdf/renderer", () => ({
  StyleSheet: { create: (o: unknown) => o },
  Document: "Document",
  Page: "Page",
  View: "View",
  Text: "Text",
}));

import type { ReactElement, ReactNode } from "react";
import { RelatorioITRPdf } from "@/lib/fiscal/itr-report-pdf";
import { montarRelatorioITR, EXEMPLO_MOCK } from "@/lib/fiscal/itr-report";

/** Concatena todo texto da árvore de elementos, em ordem. */
function textoDaArvore(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textoDaArvore).join(" ");

  const el = node as ReactElement<{ children?: ReactNode }>;
  if (el?.props) return textoDaArvore(el.props.children);
  return "";
}

const textoDoDoc = (r: ReturnType<typeof montarRelatorioITR>) =>
  textoDaArvore(RelatorioITRPdf({ r, geradoEm: "08/09/2026" }));

// ── As três garantias ───────────────────────────────────────────────────────

describe("garantias do documento", () => {
  it("1 — carimba NÃO PUBLICÁVEL quando alguma regra não foi verificada", () => {
    const r = montarRelatorioITR(EXEMPLO_MOCK); // lotação e conversão UA sem verificação
    expect(r.publicavel).toBe(false);

    const txt = textoDoDoc(r);
    expect(txt).toMatch(/não publicável/i);
    expect(txt).toMatch(/preliminar/i);
    expect(txt).toMatch(/índice de lotação/i);
  });

  it("2 — diz sempre que quem declara e assina é o contador", () => {
    const txt = textoDoDoc(montarRelatorioITR(EXEMPLO_MOCK));
    expect(txt).toMatch(/NÃO é declaração fiscal/i);
    expect(txt).toMatch(/contador responsável/i);
  });

  it("3 — mostra pastagem DECLARADA e COMPROVADA, com a diferença", () => {
    const txt = textoDoDoc(montarRelatorioITR(EXEMPLO_MOCK));
    expect(txt).toMatch(/pastagem declarada/i);
    expect(txt).toMatch(/pastagem comprovada pelo rebanho/i);
    expect(txt).toMatch(/diferença sem comprovação/i);
    // E explica que o GU saiu da comprovada, não da declarada.
    expect(txt).toMatch(/COMPROVADA pelo rebanho, não sobre a declarada/i);
  });
});

// ── Conteúdo obrigatório ────────────────────────────────────────────────────

describe("conteúdo do relatório", () => {
  const txt = textoDoDoc(montarRelatorioITR(EXEMPLO_MOCK));

  it("cita a base normativa verificada", () => {
    expect(txt).toMatch(/9\.393/);
    expect(txt).toMatch(/art\. 11/i);
  });

  it("traz os três números que o contador precisa conferir", () => {
    expect(txt).toMatch(/grau de utilização/i);
    expect(txt).toMatch(/alíquota resultante/i);
    expect(txt).toMatch(/imposto estimado/i);
  });

  it("qualquer valor em reais vem rotulado como estimado", () => {
    // Regra de linguagem da casa: nada de valor prometido sem "estimado".
    expect(txt).toMatch(/estimado/i);
    expect(txt).not.toMatch(/garantido|você tem direito|recuperação tributária/i);
  });

  it("abre espaço de assinatura para o contador, com CRC", () => {
    expect(txt).toMatch(/CRC/);
    expect(txt).toMatch(/assinatura/i);
  });

  it("detalha o rebanho por categoria e o total em UA", () => {
    expect(txt).toMatch(/rebanho médio mensal/i);
    expect(txt).toMatch(/unidades animais/i);
    expect(txt).toContain("vaca");
  });

  it("o mock se identifica como mock dentro do documento", () => {
    expect(txt).toContain("[MOCK]");
  });
});

// ── Casos degradados ────────────────────────────────────────────────────────

describe("relatório degradado", () => {
  it("sem índice de lotação, o documento se monta e mostra os achados críticos", () => {
    const r = montarRelatorioITR({ ...EXEMPLO_MOCK, indiceLotacaoUAporHa: null, serieRebanho: [] });
    expect(r.guPct).toBeNull();

    const txt = textoDoDoc(r);
    expect(txt).toMatch(/Crítico/);
    expect(txt).toMatch(/índice de lotação da zona não informado/i);
    expect(txt).toMatch(/sem série de rebanho/i);
  });

  it("categoria sem fator de UA aparece marcada no documento", () => {
    const r = montarRelatorioITR({
      ...EXEMPLO_MOCK,
      serieRebanho: [{ mes: "2025-01", porCategoria: { vaca: 100, bufala: 30 } }],
      fatoresUA: { vaca: 1.0 },
    });
    const txt = textoDoDoc(r);
    expect(txt).toContain("bufala");
    expect(txt).toMatch(/sem fator/i);
  });
});

// ── Relatório publicável ────────────────────────────────────────────────────

describe("quando todas as regras estiverem verificadas", () => {
  const r = montarRelatorioITR({
    ...EXEMPLO_MOCK,
    propriedade: { nome: "Fazenda Exemplo", municipio: "Jussara", uf: "GO", nirf: "1.234.567-8" },
    regrasVerificadas: { tabelaAliquotas: true, indiceLotacao: true, conversaoUA: true },
  });

  it("o carimbo de preliminar some", () => {
    expect(r.publicavel).toBe(true);
    expect(textoDoDoc(r)).not.toMatch(/documento preliminar/i);
  });

  it("mas o aviso sobre o contador permanece — não depende da verificação", () => {
    const txt = textoDoDoc(r);
    expect(txt).toMatch(/NÃO é declaração fiscal/i);
    expect(txt).toMatch(/contador responsável/i);
  });

  it("o NIRF aparece no cabeçalho quando informado", () => {
    expect(textoDoDoc(r)).toContain("1.234.567-8");
  });
});
