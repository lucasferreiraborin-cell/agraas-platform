"use client";

import { useActionState, useState } from "react";
import { SETOR_NOME, type AtividadeCodigo, type Setor } from "@/lib/gestao/atividades";
import { ATIVIDADES_ESCOLHA } from "@/lib/gestao/comecar";
import { btnPrimario, campo, rotuloCampo } from "../ui";
import { criarEstruturaInicial, type EstadoPasso1 } from "./actions";

const INICIAL: EstadoPasso1 = { versao: 0 };
const SETORES: Setor[] = ["pecuaria", "agricultura"];

type Valores = { nome: string; cultura: string; cabecas: string; area: string; safra: string };

export default function Passo1({ safraInicial }: { safraInicial: string }) {
  const [estado, acao, pendente] = useActionState(criarEstruturaInicial, INICIAL);
  const [marcadas, setMarcadas] = useState<AtividadeCodigo[]>([]);
  const [valores, setValores] = useState<Partial<Record<AtividadeCodigo, Valores>>>({});

  const vazio: Valores = { nome: "", cultura: "", cabecas: "", area: "", safra: safraInicial };
  const de = (c: AtividadeCodigo): Valores => valores[c] ?? vazio;
  const mudar = (c: AtividadeCodigo, k: keyof Valores, v: string) =>
    setValores((s) => ({ ...s, [c]: { ...(s[c] ?? vazio), [k]: v } }));
  const alternar = (c: AtividadeCodigo) =>
    setMarcadas((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]));

  return (
    <form action={acao} className="space-y-8">
      <fieldset className="space-y-6">
        <legend className="sr-only">Atividades da fazenda</legend>
        {SETORES.map((s) => (
          <div key={s}>
            <p className="mb-2.5 text-[.8rem] font-semibold text-[var(--text-secondary)]">{SETOR_NOME[s]}</p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {ATIVIDADES_ESCOLHA.filter((a) => a.setor === s).map((a) => (
                <label key={a.codigo} className="block cursor-pointer">
                  <input
                    type="checkbox" name="atividade" value={a.codigo} className="peer sr-only"
                    checked={marcadas.includes(a.codigo)} onChange={() => alternar(a.codigo)}
                  />
                  <span className="flex min-h-[56px] items-center rounded-2xl border border-[var(--border-strong)] bg-white px-4 py-3 text-[.92rem] font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-soft)] peer-checked:border-[var(--primary)] peer-checked:bg-[var(--primary-soft)] peer-checked:text-[var(--primary-hover)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--primary)]">
                    {a.nome}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>

      {marcadas.length > 0 && (
        <div className="space-y-4">
          <p className="text-[.85rem] text-[var(--text-secondary)]">Só o básico de cada uma. O resto você completa depois.</p>
          {marcadas.map((codigo) => {
            const a = ATIVIDADES_ESCOLHA.find((x) => x.codigo === codigo)!;
            const v = de(codigo);
            const agro = a.setor === "agricultura";
            const id = (k: string) => `${k}-${codigo}`;
            return (
              <section key={codigo} aria-labelledby={id("t")} className="rounded-3xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-soft)] sm:p-5">
                <h3 id={id("t")} className="mb-3 text-[.95rem] font-semibold text-[var(--text-primary)]">{a.nome}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor={id("nome")} className={rotuloCampo}>{agro ? "Nome do talhão" : "Nome do lote"}</label>
                    <input id={id("nome")} name={`nome_${codigo}`} maxLength={80} autoComplete="off" className={campo}
                      value={v.nome} onChange={(e) => mudar(codigo, "nome", e.target.value)}
                      placeholder={agro ? "Ex.: Talhão 1" : "Ex.: Lote de recria"} />
                  </div>
                  {agro ? (
                    <>
                      <div>
                        <label htmlFor={id("area")} className={rotuloCampo}>Área em hectares</label>
                        <input id={id("area")} name={`area_${codigo}`} required inputMode="decimal" autoComplete="off" className={campo}
                          value={v.area} onChange={(e) => mudar(codigo, "area", e.target.value)} placeholder="120,5" />
                      </div>
                      <div>
                        <label htmlFor={id("cultura")} className={rotuloCampo}>Cultura</label>
                        <input id={id("cultura")} name={`cultura_${codigo}`} maxLength={60} list={id("sug")} autoComplete="off" className={campo}
                          value={v.cultura} onChange={(e) => mudar(codigo, "cultura", e.target.value)}
                          placeholder={a.exemplos[0] ?? ""} />
                        <datalist id={id("sug")}>{a.exemplos.map((x) => <option key={x} value={x} />)}</datalist>
                      </div>
                      <div>
                        <label htmlFor={id("safra")} className={rotuloCampo}>Safra</label>
                        <input id={id("safra")} name={`safra_${codigo}`} inputMode="numeric" maxLength={7} pattern="\d{4}/\d{2}" title="Formato 2026/27"
                          className={campo} value={v.safra} onChange={(e) => mudar(codigo, "safra", e.target.value)} />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label htmlFor={id("cabecas")} className={rotuloCampo}>Quantas cabeças</label>
                      <input id={id("cabecas")} name={`cabecas_${codigo}`} required inputMode="numeric" autoComplete="off" className={campo}
                        value={v.cabecas} onChange={(e) => mudar(codigo, "cabecas", e.target.value)} placeholder="250" />
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div aria-live="polite">
        {estado.erro && <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{estado.erro}</p>}
      </div>

      <button type="submit" disabled={pendente || marcadas.length === 0} className={`${btnPrimario} w-full !py-4 !text-[1rem] sm:w-auto sm:min-w-[220px]`}>
        {pendente ? "Criando…" : "Continuar"}
      </button>
    </form>
  );
}
