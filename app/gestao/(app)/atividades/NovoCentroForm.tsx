"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ATIVIDADES, CENTRO_TIPO_NOME, SETOR_NOME, atividade,
  type AtividadeCodigo, type CentroTipo, type Setor,
} from "@/lib/gestao/atividades";
import { btnPrimario, btnSecundario, campo, rotuloCampo } from "../ui";

const SETORES: Setor[] = ["pecuaria", "agricultura", "apoio"];

export default function NovoCentroForm({ action }: { action: (fd: FormData) => void | Promise<void> }) {
  const [codigo, setCodigo] = useState<AtividadeCodigo>("bovino_corte");
  const [tipo, setTipo] = useState<CentroTipo>("lote_animal");
  const [cultura, setCultura] = useState("");
  const ativ = atividade(codigo);

  function escolher(c: AtividadeCodigo) {
    setCodigo(c);
    setTipo(atividade(c).centroPadrao);
    setCultura("");
  }

  return (
    <form action={action} className="space-y-6">
      <fieldset>
        <legend className={rotuloCampo}>Atividade</legend>
        <div className="space-y-4">
          {SETORES.map((s) => (
            <div key={s}>
              <p className="mb-2 text-[.72rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{SETOR_NOME[s]}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {ATIVIDADES.filter((a) => a.setor === s).map((a) => (
                  <label key={a.codigo} className="block cursor-pointer">
                    <input
                      type="radio" name="atividade" value={a.codigo} className="peer sr-only" required
                      checked={codigo === a.codigo} onChange={() => escolher(a.codigo)}
                    />
                    <span className="flex h-full min-h-[48px] items-center rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-[.85rem] font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-soft)] peer-checked:border-[var(--primary)] peer-checked:bg-[var(--primary-soft)] peer-checked:text-[var(--primary-hover)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--primary)]">
                      {a.nome}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[.8rem] text-[var(--text-muted)]">
          {ativ.nome}: vende em <strong className="font-semibold text-[var(--text-secondary)]">{ativ.unidadeVenda}</strong> · acompanha {ativ.indicadorCusto}.
        </p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nome" className={rotuloCampo}>Nome do centro</label>
          <input id="nome" name="nome" required minLength={2} maxLength={80} className={campo}
            placeholder={ativ.setor === "agricultura" ? "Ex.: Talhão 3 — Soja" : ativ.setor === "pecuaria" ? "Ex.: Lote de recria" : "Ex.: Oficina"} />
        </div>
        <div>
          <label htmlFor="tipo" className={rotuloCampo}>Tipo de centro</label>
          <select id="tipo" name="tipo" className={campo} value={tipo} onChange={(e) => setTipo(e.target.value as CentroTipo)}>
            {(Object.keys(CENTRO_TIPO_NOME) as CentroTipo[]).map((t) => (
              <option key={t} value={t}>{CENTRO_TIPO_NOME[t]}</option>
            ))}
          </select>
        </div>

        {ativ.setor !== "apoio" && (
          <div className="sm:col-span-2">
            <label htmlFor="cultura" className={rotuloCampo}>{ativ.setor === "agricultura" ? "Cultura" : "Categoria"} (opcional)</label>
            <input id="cultura" name="cultura" maxLength={60} className={campo} value={cultura} onChange={(e) => setCultura(e.target.value)} />
            {ativ.exemplos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Sugestões">
                {ativ.exemplos.map((ex) => (
                  <button key={ex} type="button" onClick={() => setCultura(ex)}
                    className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-[.78rem] text-[var(--text-secondary)] transition hover:bg-[var(--surface-soft)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]">
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {ativ.setor === "agricultura" && (
          <>
            <div>
              <label htmlFor="safra" className={rotuloCampo}>Safra (opcional)</label>
              <input id="safra" name="safra" className={campo} placeholder="2026/27" pattern="\d{4}/\d{2}" title="Formato 2026/27" inputMode="numeric" maxLength={7} />
            </div>
            <div>
              <label htmlFor="area_ha" className={rotuloCampo}>Área em hectares (opcional)</label>
              <input id="area_ha" name="area_ha" className={campo} inputMode="decimal" placeholder="120,5" />
            </div>
          </>
        )}

        {ativ.setor === "pecuaria" && (
          <div>
            <label htmlFor="cabecas" className={rotuloCampo}>Cabeças (opcional)</label>
            <input id="cabecas" name="cabecas" className={campo} inputMode="numeric" placeholder="250" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btnPrimario}>Salvar centro</button>
        <Link href="/gestao/atividades" className={btnSecundario}>Cancelar</Link>
      </div>
    </form>
  );
}
