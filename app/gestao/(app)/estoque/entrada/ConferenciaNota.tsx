"use client";

import { useActionState, useMemo, useState } from "react";
import { brl } from "@/lib/gestao/format";
import { custoUnitarioDaEntrada, fatorDaEntrada, quantidadeNaUnidadeDoProduto } from "@/lib/gestao/estoque-entrada";
import { lerQuantidade } from "@/lib/gestao/estoque";
import { atividade, SETOR_NOME, type Setor } from "@/lib/gestao/atividades";
import { Selo, btnPrimario, campo, rotuloCampo } from "../../ui";
import { custoUnit, qtd } from "../ui-estoque";
import { confirmarEntrada, type EstadoEntrada } from "./actions";

export type LinhaConferencia = {
  itemId: string;
  descricao: string;
  ncmFmt: string | null;
  unidadeNota: string | null;
  quantidadeNota: number | null;
  unitario: number | null;
  total: number | null;
  produtoSugerido: string | null;
  confianca: "lembrado" | "alta" | "media" | "baixa" | null;
  via: string | null;
  /** Apelido gravado para (texto, fornecedor): o fator só vale para esse produto e unidade. */
  apelido: { produtoId: string; unidadeNota: string | null; fatorConversao: number | null } | null;
  novoNome: string;
  novoUnidade: string | null;
  novoFator: number | null;
  categoriaSugerida: string | null;
  categoriaMotivo: string | null;
  categoriaPlataforma: string | null;
  almoxSugerido: string | null;
};
export type ProdutoOpcao = { id: string; nome: string; unidade: string | null; categoriaId: string | null; almoxPadraoId: string | null };
type Opcao = { id: string; nome: string };
type Centro = { id: string; nome: string; atividade: string };

type EstadoLinha = {
  incluir: boolean;
  modo: "existente" | "novo";
  produtoId: string;
  categoriaId: string;
  novoNome: string;
  novoUnidade: string;
  destino: "estoque" | "direto";
  almoxarifadoId: string;
  maquinaId: string;
  centroId: string;
  destinoTipo: string;
  quantidade: string;
  quantidadeTocada: boolean;
};

const INICIAL: EstadoEntrada = { versao: 0 };
const NUM = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 6, useGrouping: false });
const fmtQ = (v: number | null) => (v === null ? "" : NUM.format(v));
const CONFIANCA: Record<NonNullable<LinhaConferencia["confianca"]>, { rotulo: string; tom: "verde" | "alerta" | "neutro" }> = {
  lembrado: { rotulo: "Lembrado", tom: "verde" },
  alta: { rotulo: "Confiança alta", tom: "verde" },
  media: { rotulo: "Confiança média", tom: "alerta" },
  baixa: { rotulo: "Confiança baixa", tom: "neutro" },
};
const ORDEM_SETOR: Setor[] = ["pecuaria", "agricultura", "apoio"];

function quantidadeSugerida(l: LinhaConferencia, e: Pick<EstadoLinha, "modo" | "produtoId">, produtos: Map<string, ProdutoOpcao>): string {
  if (e.modo === "novo") return fmtQ(quantidadeNaUnidadeDoProduto(l.quantidadeNota, l.novoFator));
  const p = produtos.get(e.produtoId);
  if (!p) return "";
  const apelido = l.apelido && l.apelido.produtoId === p.id ? l.apelido : null;
  const f = fatorDaEntrada({ descricao: l.descricao, unidade: l.unidadeNota }, p.unidade, apelido);
  return fmtQ(quantidadeNaUnidadeDoProduto(l.quantidadeNota, f.fator));
}

function estadoInicial(l: LinhaConferencia, produtos: Map<string, ProdutoOpcao>): EstadoLinha {
  const preSeleciona = l.produtoSugerido && produtos.has(l.produtoSugerido) && l.confianca !== "baixa";
  const modo: EstadoLinha["modo"] = preSeleciona ? "existente" : "novo";
  const produtoId = preSeleciona ? l.produtoSugerido! : "";
  const p = produtos.get(produtoId);
  const base = { modo, produtoId };
  return {
    incluir: true,
    ...base,
    categoriaId: (p ? p.categoriaId : null) ?? l.categoriaSugerida ?? "",
    novoNome: l.novoNome,
    novoUnidade: l.novoUnidade ?? "",
    destino: "estoque",
    almoxarifadoId: (p?.almoxPadraoId ?? l.almoxSugerido) ?? "",
    maquinaId: "",
    centroId: "",
    destinoTipo: "",
    quantidade: quantidadeSugerida(l, base, produtos),
    quantidadeTocada: false,
  };
}

function OpcoesCentro({ centros }: { centros: Centro[] }) {
  return (
    <>
      {ORDEM_SETOR.map((s) => {
        const itens = centros.filter((c) => atividade(c.atividade).setor === s);
        return itens.length === 0 ? null : (
          <optgroup key={s} label={SETOR_NOME[s]}>
            {itens.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </optgroup>
        );
      })}
    </>
  );
}

export function ConferenciaNota({
  notaId, origem, linhas, produtos, categorias, almoxarifados, maquinas, centros, fornecedorAviso,
}: {
  notaId: string;
  origem: "canonica" | "legado";
  linhas: LinhaConferencia[];
  produtos: ProdutoOpcao[];
  categorias: Array<Opcao & { grupo: string }>;
  almoxarifados: Opcao[];
  maquinas: Opcao[];
  centros: Centro[];
  fornecedorAviso: string | null;
}) {
  const porId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);
  const [estado, acao, pendente] = useActionState(confirmarEntrada, INICIAL);
  const [estados, setEstados] = useState<EstadoLinha[]>(() => linhas.map((l) => estadoInicial(l, porId)));
  const grupos = useMemo(() => [...new Set(categorias.map((c) => c.grupo))], [categorias]);

  const mudar = (i: number, patch: Partial<EstadoLinha>) =>
    setEstados((atual) => atual.map((e, k) => (k === i ? { ...e, ...patch } : e)));

  const escolherProduto = (i: number, valor: string) => {
    const l = linhas[i];
    if (valor === "__novo") {
      mudar(i, {
        modo: "novo", produtoId: "", categoriaId: l.categoriaSugerida ?? "", almoxarifadoId: l.almoxSugerido ?? estados[i].almoxarifadoId,
        quantidade: estados[i].quantidadeTocada ? estados[i].quantidade : quantidadeSugerida(l, { modo: "novo", produtoId: "" }, porId),
      });
      return;
    }
    const p = porId.get(valor);
    mudar(i, {
      modo: "existente", produtoId: valor,
      categoriaId: (p?.categoriaId ?? l.categoriaSugerida) ?? "",
      almoxarifadoId: p?.almoxPadraoId ?? estados[i].almoxarifadoId,
      quantidade: quantidadeSugerida(l, { modo: "existente", produtoId: valor }, porId),
      quantidadeTocada: false,
    });
  };

  const incluidos = estados.filter((e) => e.incluir).length;
  const totalIncluido = linhas.reduce((s, l, i) => s + (estados[i].incluir ? l.total ?? 0 : 0), 0);
  const payload = JSON.stringify({
    notaId, origem,
    itens: linhas.map((l, i) => {
      const e = estados[i];
      return {
        itemId: l.itemId, origem, incluir: e.incluir, modo: e.modo,
        produtoId: e.modo === "existente" && e.produtoId ? e.produtoId : null,
        categoriaId: e.categoriaId || null,
        novoNome: e.novoNome.slice(0, 120), novoUnidade: e.novoUnidade.slice(0, 10),
        novoCategoriaPlataforma: l.categoriaPlataforma,
        destino: e.destino,
        almoxarifadoId: e.destino === "estoque" ? e.almoxarifadoId || null : null,
        maquinaId: e.destino === "direto" ? e.maquinaId || null : null,
        centroId: e.destino === "direto" ? e.centroId || null : null,
        destinoTipo: e.destino === "direto" && e.destinoTipo ? e.destinoTipo : null,
        quantidade: e.quantidade.slice(0, 30),
      };
    }),
  });

  return (
    <form action={acao} className="space-y-5">
      <input type="hidden" name="payload" value={payload} />
      <ol className="space-y-4">
        {linhas.map((l, i) => {
          const e = estados[i];
          const p = e.modo === "existente" ? porId.get(e.produtoId) : undefined;
          const unidade = e.modo === "novo" ? e.novoUnidade.toUpperCase() : p?.unidade ?? "";
          const q = lerQuantidade(e.quantidade);
          const custo = custoUnitarioDaEntrada(l.total, q);
          const pedeCategoria = e.modo === "novo" || (p !== undefined && !p.categoriaId);
          const id = (campoId: string) => `cf-${i}-${campoId}`;
          const conversao = l.quantidadeNota !== null && q !== null && l.unidadeNota && unidade && l.unidadeNota.toUpperCase() !== unidade
            ? `${qtd(l.quantidadeNota)} ${l.unidadeNota} na nota → ${qtd(q)} ${unidade} no estoque`
            : null;
          return (
            <li key={l.itemId} className={`rounded-2xl border p-4 transition sm:p-5 ${e.incluir ? "border-[var(--border-strong)] bg-white" : "border-dashed border-[var(--border)] bg-[var(--surface-soft)] opacity-80"}`}>
              <fieldset className="min-w-0 space-y-4">
                <legend className="sr-only">Item {i + 1}: {l.descricao}</legend>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] [overflow-wrap:anywhere]">{l.descricao}</p>
                    <p className="mt-0.5 text-[.8rem] text-[var(--text-muted)]">
                      {l.quantidadeNota !== null ? `${qtd(l.quantidadeNota)} ${l.unidadeNota ?? ""}` : "Quantidade não lida"}
                      {l.unitario !== null ? ` × ${brl(l.unitario)}` : ""}
                      {l.total !== null ? ` = ${brl(l.total)}` : ""}
                      {l.ncmFmt ? ` · NCM ${l.ncmFmt}` : ""}
                    </p>
                  </div>
                  <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[.8rem] font-semibold text-[var(--text-secondary)]">
                    <input type="checkbox" checked={e.incluir} onChange={(ev) => mudar(i, { incluir: ev.target.checked })} className="size-5 accent-[var(--primary)]" />
                    Lançar
                  </label>
                </div>

                {e.incluir && (
                  <>
                    <div>
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <label htmlFor={id("produto")} className="text-[.78rem] font-semibold text-[var(--text-secondary)]">Produto</label>
                        {e.modo === "existente" && e.produtoId === l.produtoSugerido && l.confianca && (
                          <span className="flex items-center gap-1.5 text-[.75rem] text-[var(--text-muted)]">
                            <Selo tom={CONFIANCA[l.confianca].tom}>{CONFIANCA[l.confianca].rotulo}</Selo>{l.via}
                          </span>
                        )}
                      </div>
                      <select id={id("produto")} value={e.modo === "novo" ? "__novo" : e.produtoId} onChange={(ev) => escolherProduto(i, ev.target.value)} className={campo}>
                        {e.modo === "existente" && !e.produtoId && <option value="" disabled>Escolha o produto</option>}
                        <option value="__novo">+ Criar produto novo a partir deste item</option>
                        {produtos.map((op) => <option key={op.id} value={op.id}>{op.nome}{op.unidade ? ` (${op.unidade})` : ""}</option>)}
                      </select>
                      {l.produtoSugerido && e.modo === "novo" && porId.has(l.produtoSugerido) && (
                        <button type="button" onClick={() => escolherProduto(i, l.produtoSugerido!)}
                          className="mt-1.5 text-[.8rem] font-semibold text-[var(--primary-hover)] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
                          Parecido: {porId.get(l.produtoSugerido)!.nome} ({CONFIANCA[l.confianca ?? "baixa"].rotulo.toLowerCase()}) — usar este
                        </button>
                      )}
                    </div>

                    {e.modo === "novo" && (
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
                        <div className="min-w-0">
                          <label htmlFor={id("nome")} className={rotuloCampo}>Nome do produto novo</label>
                          <input id={id("nome")} value={e.novoNome} maxLength={120} onChange={(ev) => mudar(i, { novoNome: ev.target.value })} className={campo} />
                        </div>
                        <div className="min-w-0">
                          <label htmlFor={id("un")} className={rotuloCampo}>Unidade</label>
                          <input id={id("un")} value={e.novoUnidade} maxLength={10} placeholder="L, KG, UN"
                            onChange={(ev) => mudar(i, { novoUnidade: ev.target.value.toUpperCase() })} className={`${campo} uppercase`} />
                        </div>
                      </div>
                    )}

                    {pedeCategoria && (
                      <div>
                        <label htmlFor={id("cat")} className={rotuloCampo}>Categoria</label>
                        <select id={id("cat")} value={e.categoriaId} onChange={(ev) => mudar(i, { categoriaId: ev.target.value })} className={campo}
                          aria-describedby={l.categoriaMotivo ? id("cat-dica") : undefined}>
                          <option value="">Escolha a categoria</option>
                          {grupos.map((g) => (
                            <optgroup key={g} label={g}>
                              {categorias.filter((c) => c.grupo === g).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                            </optgroup>
                          ))}
                        </select>
                        {l.categoriaMotivo && e.categoriaId && e.categoriaId === l.categoriaSugerida && (
                          <p id={id("cat-dica")} className="mt-1.5 text-[.76rem] text-[var(--text-muted)]">Sugerida: {l.categoriaMotivo}</p>
                        )}
                      </div>
                    )}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="min-w-0">
                        <label htmlFor={id("qtd")} className={rotuloCampo}>Quantidade que entra{unidade ? ` (${unidade})` : ""}</label>
                        <input id={id("qtd")} inputMode="decimal" autoComplete="off" value={e.quantidade}
                          onChange={(ev) => mudar(i, { quantidade: ev.target.value, quantidadeTocada: true })} className={campo}
                          aria-describedby={id("qtd-dica")} placeholder={l.unidadeNota ? `Nota: ${qtd(l.quantidadeNota)} ${l.unidadeNota}` : ""} />
                        <p id={id("qtd-dica")} className="mt-1.5 text-[.76rem] text-[var(--text-muted)]">
                          {q === null
                            ? `Não deu para converter sozinho. Quantos ${unidade || "unidades"} entram? A nota diz ${qtd(l.quantidadeNota)} ${l.unidadeNota ?? ""}.`
                            : conversao ?? "Mesma unidade da nota."}
                          {custo !== null ? ` Custo: ${custoUnit(custo, unidade || null)}.` : ""}
                        </p>
                      </div>
                      <fieldset className="min-w-0">
                        <legend className={rotuloCampo}>Destino</legend>
                        <div className="grid grid-cols-2 gap-2">
                          {([["estoque", "Estoque"], ["direto", "Aplicação direta"]] as const).map(([k, nome]) => (
                            <label key={k} className={`flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2.5 text-center text-[.84rem] font-semibold transition focus-within:ring-2 focus-within:ring-[var(--primary)]/30 ${
                              e.destino === k ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-hover)]" : "border-[var(--border)] bg-white text-[var(--text-secondary)]"}`}>
                              <input type="radio" name={id("destino")} value={k} checked={e.destino === k} onChange={() => mudar(i, { destino: k })} className="sr-only" />
                              {nome}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </div>

                    {e.destino === "estoque" ? (
                      <div>
                        <label htmlFor={id("almox")} className={rotuloCampo}>Almoxarifado</label>
                        <select id={id("almox")} value={e.almoxarifadoId} onChange={(ev) => mudar(i, { almoxarifadoId: ev.target.value })} className={campo}>
                          <option value="">Escolha o almoxarifado</option>
                          {almoxarifados.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                        </select>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="min-w-0">
                          <label htmlFor={id("maq")} className={rotuloCampo}>Máquina</label>
                          <select id={id("maq")} value={e.maquinaId} onChange={(ev) => mudar(i, { maquinaId: ev.target.value })} className={campo}>
                            <option value="">Nenhuma</option>
                            {maquinas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                          </select>
                        </div>
                        <div className="min-w-0">
                          <label htmlFor={id("cc")} className={rotuloCampo}>Centro de custo</label>
                          <select id={id("cc")} value={e.centroId} onChange={(ev) => mudar(i, { centroId: ev.target.value })} className={campo}>
                            <option value="">Nenhum</option>
                            <OpcoesCentro centros={centros} />
                          </select>
                        </div>
                        <div className="min-w-0">
                          <label htmlFor={id("tipo")} className={rotuloCampo}>Uso</label>
                          <select id={id("tipo")} value={e.destinoTipo} onChange={(ev) => mudar(i, { destinoTipo: ev.target.value })} className={campo}>
                            <option value="">{e.maquinaId ? "Manutenção" : "Aplicação"}</option>
                            <option value="manutencao">Manutenção (máquina)</option>
                            <option value="abastecimento">Abastecimento (máquina)</option>
                            <option value="aplicacao">Aplicação (centro)</option>
                            <option value="consumo">Consumo (centro)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </fieldset>
            </li>
          );
        })}
      </ol>

      <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 rounded-2xl border border-[var(--border-strong)] bg-white/95 p-4 shadow-[var(--shadow-card)] backdrop-blur lg:bottom-4">
        <div aria-live="polite" className="space-y-3">
          {estado.erro && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{estado.erro}</p>}
          {estado.ok && <p role="status" className="rounded-xl bg-[var(--primary-soft)] px-4 py-3 text-[.88rem] font-semibold text-[var(--primary-hover)]">{estado.ok}</p>}
        </div>
        <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${estado.erro || estado.ok ? "mt-3" : ""}`}>
          <p className="text-[.84rem] text-[var(--text-secondary)]">
            <span className="font-semibold tabular-nums text-[var(--text-primary)]">{incluidos} de {linhas.length}</span> {linhas.length === 1 ? "item" : "itens"} · {brl(totalIncluido)}
            {fornecedorAviso ? <span className="block text-[.78rem] text-[var(--text-muted)]">{fornecedorAviso}</span> : null}
          </p>
          <button type="submit" disabled={pendente || incluidos === 0} className={`${btnPrimario} w-full sm:w-auto`}>
            {pendente ? "Dando entrada…" : `Confirmar entrada${incluidos > 1 ? ` (${incluidos} itens)` : ""}`}
          </button>
        </div>
      </div>
    </form>
  );
}
