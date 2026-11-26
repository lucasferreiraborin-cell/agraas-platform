"use client";

import Link from "next/link";
import { useActionState } from "react";
import { btnPrimario, btnSecundario, campo, rotuloCampo } from "../../ui";
import { salvarProduto, type EstadoCadastro } from "../actions";

type CategoriaOpcao = { id: string; nome: string; grupo: string };
type AlmoxOpcao = { id: string; nome: string };
export type ProdutoForm = {
  id: string; nome: string; unidade: string; categoriaId: string; ncm: string; almoxarifadoId: string;
  minimo: string; maximo: string; gtin: string; ativo: boolean;
};

const INICIAL: EstadoCadastro = { versao: 0 };
const UNIDADES = ["L", "KG", "UN", "T", "ML", "G", "SC", "DOSE", "M"];

function OpcoesCategoria({ categorias }: { categorias: CategoriaOpcao[] }) {
  const grupos = [...new Set(categorias.map((c) => c.grupo))];
  return (
    <>
      {grupos.map((g) => (
        <optgroup key={g} label={g}>
          {categorias.filter((c) => c.grupo === g).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </optgroup>
      ))}
    </>
  );
}

export function FormProduto({ categorias, almoxarifados, produto }: {
  categorias: CategoriaOpcao[];
  almoxarifados: AlmoxOpcao[];
  produto?: ProdutoForm;
}) {
  const [estado, acao, pendente] = useActionState(salvarProduto, INICIAL);
  const v = estado.valores ?? {};
  const val = (k: keyof ProdutoForm, padrao = "") =>
    v[k] ?? (produto ? String(produto[k] ?? "") : padrao);
  const pfx = produto ? `pe-${produto.id.slice(0, 8)}` : "pn";

  return (
    <form key={produto ? `e-${estado.versao}` : estado.versao} action={acao} className="space-y-4">
      {produto && <input type="hidden" name="id" value={produto.id} />}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
        <div className="min-w-0">
          <label htmlFor={`${pfx}-nome`} className={rotuloCampo}>Nome</label>
          <input id={`${pfx}-nome`} name="nome" required minLength={2} maxLength={120} autoComplete="off"
            defaultValue={val("nome")} placeholder="Ex.: Óleo diesel S10" className={campo} />
        </div>
        <div className="min-w-0">
          <label htmlFor={`${pfx}-unidade`} className={rotuloCampo}>Unidade</label>
          <input id={`${pfx}-unidade`} name="unidade" required maxLength={10} list={`${pfx}-unidades`} autoComplete="off"
            defaultValue={val("unidade")} placeholder="L, KG, UN" className={`${campo} uppercase`} aria-describedby={`${pfx}-unidade-dica`} />
          <datalist id={`${pfx}-unidades`}>{UNIDADES.map((u) => <option key={u} value={u} />)}</datalist>
        </div>
      </div>
      <p id={`${pfx}-unidade-dica`} className="-mt-2 text-[.78rem] text-[var(--text-muted)]">
        A unidade em que o saldo é contado. Galão de 20 L e bombona de 5 L somam no mesmo estoque em litros.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor={`${pfx}-categoria`} className={rotuloCampo}>Categoria</label>
          <select id={`${pfx}-categoria`} name="categoria_id" required defaultValue={val("categoriaId")} className={campo}>
            <option value="" disabled>Escolha a categoria</option>
            <OpcoesCategoria categorias={categorias} />
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor={`${pfx}-almox`} className={rotuloCampo}>
            Almoxarifado padrão <span className="font-normal text-[var(--text-muted)]">(opcional)</span>
          </label>
          <select id={`${pfx}-almox`} name="almoxarifado_id" defaultValue={val("almoxarifadoId")} className={campo}>
            <option value="">Escolher na entrada</option>
            {almoxarifados.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="min-w-0">
          <label htmlFor={`${pfx}-min`} className={rotuloCampo}>Estoque mínimo</label>
          <input id={`${pfx}-min`} name="minimo" inputMode="decimal" autoComplete="off" defaultValue={val("minimo")} placeholder="—" className={campo} />
        </div>
        <div className="min-w-0">
          <label htmlFor={`${pfx}-max`} className={rotuloCampo}>Estoque máximo</label>
          <input id={`${pfx}-max`} name="maximo" inputMode="decimal" autoComplete="off" defaultValue={val("maximo")} placeholder="—" className={campo} />
        </div>
        <div className="min-w-0">
          <label htmlFor={`${pfx}-ncm`} className={rotuloCampo}>NCM <span className="font-normal text-[var(--text-muted)]">(opcional)</span></label>
          <input id={`${pfx}-ncm`} name="ncm" inputMode="numeric" maxLength={12} autoComplete="off" defaultValue={val("ncm")} placeholder="2710.19.21" className={campo} />
        </div>
        <div className="min-w-0">
          <label htmlFor={`${pfx}-gtin`} className={rotuloCampo}>Código de barras <span className="font-normal text-[var(--text-muted)]">(opcional)</span></label>
          <input id={`${pfx}-gtin`} name="gtin" inputMode="numeric" maxLength={14} autoComplete="off" defaultValue={val("gtin")} className={campo} />
        </div>
      </div>

      {produto && (
        <div className="flex items-center gap-2.5">
          {/* Desmarcado, só o hidden vai no form; marcado, o "1" vem antes e vale. */}
          <input id={`${pfx}-ativo`} name="ativo" type="checkbox" value="1" defaultChecked={(v.ativo ?? (produto.ativo ? "1" : "0")) !== "0"}
            className="size-5 accent-[var(--primary)]" />
          <input type="hidden" name="ativo" value="0" />
          <label htmlFor={`${pfx}-ativo`} className="text-[.88rem] text-[var(--text-primary)]">Produto ativo (aparece nas entradas e saídas)</label>
        </div>
      )}

      <div aria-live="polite">
        {estado.erro && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{estado.erro}</p>}
        {estado.ok && <p role="status" className="rounded-xl bg-[var(--primary-soft)] px-4 py-3 text-[.88rem] font-semibold text-[var(--primary-hover)]">{estado.ok}</p>}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        {produto && <Link href="/gestao/estoque/produtos" className={btnSecundario}>Voltar</Link>}
        <button type="submit" disabled={pendente || categorias.length === 0} className={`${btnPrimario} w-full sm:w-auto`}>
          {pendente ? "Salvando…" : produto ? "Salvar produto" : "Cadastrar produto"}
        </button>
      </div>
    </form>
  );
}
