"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { criarLancamento, type EstadoNovo } from "../actions";
import { OpcoesCentro, type CentroOpcao } from "../SelectCentro";
import { btnPrimario, btnSecundario, campo, rotuloCampo } from "../../ui";

export function NovoForm({ centros, tipoInicial, hoje }: {
  centros: CentroOpcao[]; tipoInicial: "pagar" | "receber"; hoje: string;
}) {
  const [estado, acao, pendente] = useActionState<EstadoNovo, FormData>(criarLancamento, {});
  const v = estado.valores;

  const [tipo, setTipo] = useState<string>(v?.tipo ?? tipoInicial);
  const [descricao, setDescricao] = useState(v?.descricao ?? "");
  const [contraparte, setContraparte] = useState(v?.contraparte ?? "");
  const [valor, setValor] = useState(v?.valor ?? "");
  const [vencimento, setVencimento] = useState(v?.vencimento ?? hoje);
  const [parcelas, setParcelas] = useState(v?.parcelas ?? "1");
  const [centro, setCentro] = useState(v?.centro ?? "");
  const [notas, setNotas] = useState(v?.notas ?? "");

  const n = Number(parcelas);
  const total = Number(valor.replace(/\./g, "").replace(",", "."));
  const dica = Number.isInteger(n) && n > 1 && Number.isFinite(total) && total > 0
    ? `${n} parcelas mensais de ${(total / n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}, uma por mês a partir do vencimento.`
    : "Com mais de uma parcela, o valor total é dividido e os vencimentos seguem de mês em mês.";

  return (
    <form action={acao} className="space-y-5" noValidate={false}>
      {estado.erro && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[.85rem] text-red-700">
          {estado.erro}
        </p>
      )}

      <fieldset>
        <legend className={rotuloCampo}>Tipo</legend>
        <div className="grid grid-cols-2 gap-2">
          {([["pagar", "A pagar"], ["receber", "A receber"]] as const).map(([cod, nome]) => (
            <label
              key={cod}
              className={`flex cursor-pointer items-center justify-center rounded-xl border px-4 py-2.5 text-[.88rem] font-semibold transition focus-within:ring-2 focus-within:ring-[var(--primary)]/30 ${
                tipo === cod
                  ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-hover)]"
                  : "border-[var(--border)] bg-white text-[var(--text-secondary)]"
              }`}
            >
              <input
                type="radio" name="tipo" value={cod} checked={tipo === cod}
                onChange={() => setTipo(cod)} className="sr-only"
              />
              {nome}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="descricao" className={rotuloCampo}>Descrição</label>
        <input
          id="descricao" name="descricao" required maxLength={160} className={campo}
          placeholder="Ex.: Ração, arrendamento, venda de bezerros"
          value={descricao} onChange={(e) => setDescricao(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="contraparte" className={rotuloCampo}>
          {tipo === "pagar" ? "Fornecedor" : "Cliente"} <span className="font-normal text-[var(--text-muted)]">(opcional)</span>
        </label>
        <input
          id="contraparte" name="contraparte" maxLength={120} className={campo}
          value={contraparte} onChange={(e) => setContraparte(e.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="valor" className={rotuloCampo}>Valor total (R$)</label>
          <input
            id="valor" name="valor" required inputMode="decimal" autoComplete="off"
            placeholder="0,00" className={campo}
            value={valor} onChange={(e) => setValor(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="vencimento" className={rotuloCampo}>Primeiro vencimento</label>
          <input
            id="vencimento" name="vencimento" type="date" required className={campo}
            value={vencimento} onChange={(e) => setVencimento(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor="parcelas" className={rotuloCampo}>Parcelas</label>
        <input
          id="parcelas" name="parcelas" type="number" min={1} max={60} step={1} inputMode="numeric"
          aria-describedby="parcelas-dica" className={`${campo} sm:max-w-[10rem]`}
          value={parcelas} onChange={(e) => setParcelas(e.target.value)}
        />
        <p id="parcelas-dica" className="mt-1.5 text-[.78rem] text-[var(--text-muted)]">{dica}</p>
      </div>

      <div>
        <label htmlFor="centro" className={rotuloCampo}>
          Centro de custo <span className="font-normal text-[var(--text-muted)]">(opcional)</span>
        </label>
        <select
          id="centro" name="centro" className={campo}
          value={centro} onChange={(e) => setCentro(e.target.value)}
        >
          <option value="">Sem centro de custo</option>
          <OpcoesCentro centros={centros} />
        </select>
      </div>

      <div>
        <label htmlFor="notas" className={rotuloCampo}>
          Observação <span className="font-normal text-[var(--text-muted)]">(opcional)</span>
        </label>
        <textarea
          id="notas" name="notas" rows={3} maxLength={500} className={campo}
          value={notas} onChange={(e) => setNotas(e.target.value)}
        />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href={`/gestao/financeiro?tipo=${tipo}`} className={btnSecundario}>Cancelar</Link>
        <button type="submit" disabled={pendente} className={btnPrimario}>
          {pendente ? "Salvando…" : n > 1 ? `Lançar ${n} parcelas` : "Salvar lançamento"}
        </button>
      </div>
    </form>
  );
}
