"use client";

import Link from "next/link";
import { useActionState } from "react";
import { TIPOS_CATEGORIA, TIPO_CATEGORIA_NOME } from "@/lib/gestao/estoque";
import { btnPrimario, btnSecundario, campo, rotuloCampo } from "../../ui";
import { salvarCategoria, type EstadoCadastro } from "../actions";

const INICIAL: EstadoCadastro = { versao: 0 };

export type CategoriaForm = { id: string; grupo: string; nome: string; tipo: string; contaId: string; ativo: boolean };
type Conta = { id: string; codigo: string; nome: string };

export function FormCategoria({ categoria, grupos, contas }: { categoria?: CategoriaForm; grupos: string[]; contas: Conta[] }) {
  const [estado, acao, pendente] = useActionState(salvarCategoria, INICIAL);
  const v = estado.valores ?? {};
  const pfx = categoria ? "ce" : "cn";

  return (
    <form key={categoria ? `e-${categoria.id}` : estado.versao} action={acao} className="space-y-4">
      {categoria && <input type="hidden" name="id" value={categoria.id} />}
      <div>
        <label htmlFor={`${pfx}-nome`} className={rotuloCampo}>Nome</label>
        <input id={`${pfx}-nome`} name="nome" required minLength={2} maxLength={60} autoComplete="off"
          defaultValue={v.nome ?? categoria?.nome ?? ""} placeholder="Ex.: Peças, Defensivos, Energia elétrica" className={campo} />
      </div>
      <div>
        <label htmlFor={`${pfx}-grupo`} className={rotuloCampo}>Grupo</label>
        <input id={`${pfx}-grupo`} name="grupo" required minLength={2} maxLength={60} autoComplete="off" list={`${pfx}-grupos`}
          defaultValue={v.grupo ?? categoria?.grupo ?? ""} placeholder="Ex.: Máquinas e frota" className={campo} />
        <datalist id={`${pfx}-grupos`}>{grupos.map((g) => <option key={g} value={g} />)}</datalist>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor={`${pfx}-tipo`} className={rotuloCampo}>Tipo</label>
          <select id={`${pfx}-tipo`} name="tipo" defaultValue={v.tipo ?? categoria?.tipo ?? "despesa"} className={campo}>
            {TIPOS_CATEGORIA.map((t) => <option key={t} value={t}>{TIPO_CATEGORIA_NOME[t]}</option>)}
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor={`${pfx}-conta`} className={rotuloCampo}>Conta do contador <span className="font-normal text-[var(--text-muted)]">(opcional)</span></label>
          <select id={`${pfx}-conta`} name="conta_id" defaultValue={v.conta_id ?? categoria?.contaId ?? ""} className={campo}>
            <option value="">Sem conta definida</option>
            {contas.map((c) => <option key={c.id} value={c.id}>{c.codigo} · {c.nome}</option>)}
          </select>
        </div>
      </div>
      {categoria && (
        <div className="flex items-center gap-2.5">
          <input id={`${pfx}-ativo`} name="ativo" type="checkbox" value="1" defaultChecked={(v.ativo ?? (categoria.ativo ? "1" : "0")) !== "0"} className="size-5 accent-[var(--primary)]" />
          <input type="hidden" name="ativo" value="0" />
          <label htmlFor={`${pfx}-ativo`} className="text-[.88rem] text-[var(--text-primary)]">Ativa (aparece nos cadastros)</label>
        </div>
      )}
      <p className="text-[.78rem] text-[var(--text-muted)]">Sem “Outros”: cada categoria diz para onde vai o dinheiro.</p>
      <div aria-live="polite">
        {estado.erro && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{estado.erro}</p>}
        {estado.ok && <p role="status" className="rounded-xl bg-[var(--primary-soft)] px-4 py-3 text-[.88rem] font-semibold text-[var(--primary-hover)]">{estado.ok}</p>}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        {categoria && <Link href="/gestao/estoque/categorias" className={btnSecundario}>Cancelar</Link>}
        <button type="submit" disabled={pendente} className={`${btnPrimario} w-full sm:w-auto`}>
          {pendente ? "Salvando…" : categoria ? "Salvar categoria" : "Criar categoria"}
        </button>
      </div>
    </form>
  );
}
