/**
 * Tests: lib/fiscal/notas-planilha.ts — planilha de notas → NotaParseada[].
 */

import { parseCsv } from "@/lib/planilha/csv";
import {
  interpretarPlanilha, mapearColunas, parseNumeroBr, parseDataBr, modeloCsv, MAX_NOTAS_POR_ARQUIVO,
} from "@/lib/fiscal/notas-planilha";
import type { Tabela } from "@/lib/planilha/csv";

function tabela(cabecalho: string[], linhas: string[][]): Tabela {
  return { cabecalho, linhas, separador: ";", codificacao: "UTF-8", totalLinhas: linhas.length };
}

describe("mapearColunas", () => {
  it("reconhece apelidos sem acento e sem caixa", () => {
    const { mapa, naoReconhecidas } = mapearColunas(["Nº da Nota", "CNPJ Emitente", "Data", "Descrição", "Qtd", "Vlr Unit", "Total Item", "Observação"]);
    expect(mapa.numero_nota).toBe(0);
    expect(mapa.emitente_cnpj).toBe(1);
    expect(mapa.data_emissao).toBe(2);
    expect(mapa.item_descricao).toBe(3);
    expect(mapa.item_quantidade).toBe(4);
    expect(mapa.item_valor_unitario).toBe(5);
    expect(mapa.item_valor_total).toBe(6);
    expect(naoReconhecidas).toEqual(["Observação"]);
  });
  it("nome oficial do modelo casa direto", () => {
    const { mapa } = mapearColunas(["numero_nota", "item_icms_aliquota", "valor_total_nota"]);
    expect(mapa.numero_nota).toBe(0);
    expect(mapa.item_icms_aliquota).toBe(1);
    expect(mapa.valor_total_nota).toBe(2);
  });
});

describe("parseNumeroBr", () => {
  it("vírgula decimal, milhar com ponto, ponto decimal do xlsx", () => {
    expect(parseNumeroBr("1.234,56")).toBe(1234.56);
    expect(parseNumeroBr("1.234")).toBe(1234);
    expect(parseNumeroBr("1234.5")).toBe(1234.5);
    expect(parseNumeroBr("R$ 95,00")).toBe(95);
    expect(parseNumeroBr("17%")).toBe(17);
    expect(parseNumeroBr("")).toBeNull();
    expect(parseNumeroBr("abc")).toBeNull();
  });
});

describe("parseDataBr", () => {
  it("dd/mm/aaaa, aaaa-mm-dd, serial do Excel", () => {
    expect(parseDataBr("20/08/2026")).toBe("2026-08-20");
    expect(parseDataBr("20-08-2026")).toBe("2026-08-20");
    expect(parseDataBr("2026-08-20")).toBe("2026-08-20");
    expect(parseDataBr("2026-08-20T10:00:00-03:00")).toBe("2026-08-20");
    expect(parseDataBr("46254")).toBe("2026-08-20");
    expect(parseDataBr("13/13/2026")).toBe("2026-13-13"); // formato ok, valor errado — quem valida é o banco
    expect(parseDataBr("ontem")).toBeNull();
    expect(parseDataBr("1001")).toBeNull(); // número curto não é serial
  });
});

describe("interpretarPlanilha", () => {
  const CAB = ["numero_nota", "serie", "emitente_cnpj", "emitente_nome", "data_emissao", "valor_total_nota",
    "item_descricao", "item_ncm", "item_cfop", "item_quantidade", "item_unidade", "item_valor_unitario", "item_valor_total", "item_icms_aliquota", "item_icms_valor"];

  it("agrupa linhas na mesma nota e soma os itens quando o total não vem", () => {
    const r = interpretarPlanilha(tabela(CAB, [
      ["456", "1", "01.234.567/0001-89", "AGRO GOIAS", "20/08/2026", "", "SAL MINERAL", "2309.90.90", "5102", "50", "SC", "95,00", "4750,00", "17", "807,50"],
      ["456", "1", "01.234.567/0001-89", "AGRO GOIAS", "20/08/2026", "", "VERMIFUGO", "30049099", "5102", "10", "FR", "120,00", "1200,00", "", ""],
      ["457", "1", "01.234.567/0001-89", "AGRO GOIAS", "21/08/2026", "300,00", "ARAME", "72171010", "5102", "1", "RL", "300,00", "300,00", "", ""],
    ]));
    expect(r.erros).toEqual([]);
    expect(r.notas).toHaveLength(2);
    const n1 = r.notas[0];
    expect(n1.header.numeroNota).toBe("456");
    expect(n1.header.emitenteCnpj).toBe("01234567000189");
    expect(n1.header.dataEmissao).toBe("2026-08-20");
    expect(n1.header.valorTotal).toBe(5950);
    expect(n1.items).toHaveLength(2);
    expect(n1.richItems[0].ncm).toBe("23099090");
    expect(n1.richItems[0].icmsAliquota).toBe(17);
    expect(n1.richItems[0].icmsValor).toBe(807.5);
    expect(n1.richItems[1].icmsAliquota).toBeNull();
    expect(n1.richItems[0].sequencia).toBe(1);
    expect(n1.richItems[1].sequencia).toBe(2);
    expect(n1.extracao.origem).toBe("planilha");
    expect(r.notas[1].header.valorTotal).toBe(300);
  });

  it("valor total do item cai em quantidade × unitário quando falta", () => {
    const r = interpretarPlanilha(tabela(CAB, [
      ["1", "", "12345678000190", "X", "01/09/2026", "", "ITEM", "", "", "3", "UN", "10,10", "", "", ""],
    ]));
    expect(r.notas[0].items[0].valorTotal).toBe(30.3);
    expect(r.notas[0].header.serie).toBe("-");
  });

  it("linha de exemplo, CNPJ inválido e data inválida são rejeitados com a linha certa", () => {
    const r = interpretarPlanilha(tabela(CAB, [
      ["EXEMPLO-APAGUE", "1", "01.234.567/0001-89", "X", "20/08/2026", "", "A", "", "", "1", "UN", "1", "1", "", ""],
      ["10", "1", "123", "X", "20/08/2026", "", "A", "", "", "1", "UN", "1", "1", "", ""],
      ["11", "1", "01.234.567/0001-89", "X", "amanhã", "", "A", "", "", "1", "UN", "1", "1", "", ""],
      ["12", "1", "01.234.567/0001-89", "X", "20/08/2026", "", "A", "", "", "1", "UN", "1", "1", "", ""],
    ]));
    expect(r.erros.map(e => [e.linha, e.campo])).toEqual([[2, "numero_nota"], [3, "emitente_cnpj"], [4, "data_emissao"]]);
    expect(r.notas.map(n => n.header.numeroNota)).toEqual(["12"]);
  });

  it("coluna obrigatória ausente para tudo, com mensagem", () => {
    const r = interpretarPlanilha(tabela(["numero_nota", "descricao"], [["1", "X"]]));
    expect(r.notas).toEqual([]);
    expect(r.colunasFaltando).toEqual(["emitente_cnpj", "data_emissao"]);
    expect(r.erros[0].mensagem).toMatch(/emitente_cnpj/);
  });

  it("nota só com cabeçalho (sem item) é aceita", () => {
    const r = interpretarPlanilha(tabela(["numero_nota", "emitente_cnpj", "data_emissao", "valor_total_nota"], [["9", "12345678000190", "01/09/2026", "1.000,00"]]));
    expect(r.notas).toHaveLength(1);
    expect(r.notas[0].items).toEqual([]);
    expect(r.notas[0].header.valorTotal).toBe(1000);
  });

  it("acima do limite por arquivo, nada é gravado", () => {
    const linhas = Array.from({ length: MAX_NOTAS_POR_ARQUIVO + 1 }, (_, i) => [`${i}`, "12345678000190", "01/09/2026", "1"]);
    const r = interpretarPlanilha(tabela(["numero_nota", "emitente_cnpj", "data_emissao", "valor_total_nota"], linhas));
    expect(r.notas).toEqual([]);
    expect(r.erros[0].mensagem).toMatch(/limite/);
  });

  it("o modelo baixado, sem as linhas de exemplo, reabre e mapeia 100% das colunas", () => {
    const t = parseCsv(Buffer.from(modeloCsv(), "utf8"));
    const { naoReconhecidas } = mapearColunas(t.cabecalho);
    expect(naoReconhecidas).toEqual([]);
    const r = interpretarPlanilha(t);
    expect(r.notas).toEqual([]); // as duas linhas são EXEMPLO-APAGUE
    expect(r.erros).toHaveLength(2);
    expect(r.erros[0].mensagem).toMatch(/exemplo/i);
  });
});
