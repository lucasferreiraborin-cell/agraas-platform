"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { btnPrimario, btnSecundario, campo, rotuloCampo } from "../../ui";
import { salvarAlmoxarifado, type EstadoCadastro } from "../actions";

const INICIAL: EstadoCadastro = { versao: 0 };
const TIPOS: Array<[string, string]> = [
  ["combustivel", "Tanque de combustível"], ["pecas", "Peças"], ["insumos", "Insumos"], ["geral", "Geral"],
];

export type AlmoxForm = { id: string; nome: string; tipo: string; capacidade: string; ativo: boolean };

export function FormAlmoxarifado({ almox }: { almox?: AlmoxForm }) {
  const [estado, acao, pendente] = useActionState(salvarAlmoxarifado, INICIAL);
  const v = estado.valores ?? {};
  const [tipo, setTipo] = useState(v.tipo ?? almox?.tipo ?? "combustivel");
  const pfx = almox ? "ae" : "an";

  return (
    <form key={almox ? `e-${almox.id}` : estado.versao} action={acao} className="space-y-4">
      {almox && <input type="hidden" name="id" value={almox.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor={`${pfx}-nome`} className={rotuloCampo}>Nome</label>
          <input id={`${pfx}-nome`} name="nome" required minLength={2} maxLength={60} autoComplete="off"
            defaultValue={v.nome ?? almox?.nome ?? ""} placeholder="Ex.: Tanque de diesel, Peças, Insumos" className={campo} />
        </div>
        <div className="min-w-0">
          <label htmlFor={`${pfx}-tipo`} className={rotuloCampo}>Tipo</label>
          <select id={`${pfx}-tipo`} name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={campo}>
            {TIPOS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </select>
        </div>
      </div>
      {tipo === "combustivel" && (
        <div className="sm:max-w-xs">
          <label htmlFor={`${pfx}-cap`} className={rotuloCampo}>Capacidade (litros) <span className="font-normal text-[var(--text-muted)]">(opcional)</span></label>
          <input id={`${pfx}-cap`} name="capacidade" inputMode="decimal" autoComplete="off"
            defaultValue={v.capacidade ?? almox?.capacidade ?? ""} placeholder="Ex.: 15.000" className={campo} aria-describedby={`${pfx}-cap-dica`} />
          <p id={`${pfx}-cap-dica`} className="mt-1.5 text-[.78rem] text-[var(--text-muted)]">Usada na conferência do tanque: contagem acima da capacidade é erro de leitura.</p>
        </div>
      )}
      {almox && (
        <div className="flex items-center gap-2.5">
          <input id={`${pfx}-ativo`} name="ativo" type="checkbox" value="1" defaultChecked={(v.ativo ?? (almox.ativo ? "1" : "0")) !== "0"} className="size-5 accent-[var(--primary)]" />
          <input type="hidden" name="ativo" value="0" />
          <label htmlFor={`${pfx}-ativo`} className="text-[.88rem] text-[var(--text-primary)]">Ativo (recebe entradas)</label>
        </div>
      )}
      <div aria-live="polite">
        {estado.erro && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{estado.erro}</p>}
        {estado.ok && <p role="status" className="rounded-xl bg-[var(--primary-soft)] px-4 py-3 text-[.88rem] font-semibold text-[var(--primary-hover)]">{estado.ok}</p>}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        {almox && <Link href="/gestao/estoque/almoxarifados" className={btnSecundario}>Cancelar</Link>}
        <button type="submit" disabled={pendente} className={`${btnPrimario} w-full sm:w-auto`}>
          {pendente ? "Salvando…" : almox ? "Salvar almoxarifado" : "Cadastrar almoxarifado"}
        </button>
      </div>
    </form>
  );
}
