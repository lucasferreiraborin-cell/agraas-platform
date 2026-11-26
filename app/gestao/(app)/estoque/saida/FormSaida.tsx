"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { brl } from "@/lib/gestao/format";
import { DESTINO_NOME, EXIGE, lerQuantidade } from "@/lib/gestao/estoque";
import { atividade, SETOR_NOME, type Setor } from "@/lib/gestao/atividades";
import { btnPrimario, btnSecundario, campo, rotuloCampo } from "../../ui";
import { custoUnit, qtd } from "../ui-estoque";
import { registrarSaida, type EstadoSaida } from "./actions";

export type SaldoOpcao = { almoxId: string | null; almoxNome: string; saldo: number; custoMedio: number | null };
type ProdutoOpcao = { id: string; nome: string; unidade: string | null };
type Opcao = { id: string; nome: string };
type Centro = { id: string; nome: string; atividade: string };

const INICIAL: EstadoSaida = { versao: 0 };
const TIPOS = ["manutencao", "aplicacao", "consumo", "ajuste"] as const;
const DICA: Record<(typeof TIPOS)[number], string> = {
  manutencao: "Peça, óleo ou filtro que foi para uma máquina.",
  aplicacao: "Insumo aplicado num talhão, lote ou piquete.",
  consumo: "Uso da atividade que não é aplicação (ex.: sal no cocho, material de consumo).",
  ajuste: "Contagem do estoque deu menos: vencido, quebra, perda. Sempre com motivo.",
};
const ORDEM_SETOR: Setor[] = ["pecuaria", "agricultura", "apoio"];

export function FormSaida({ produtos, saldos, maquinas, centros, hoje }: {
  produtos: ProdutoOpcao[];
  saldos: Record<string, SaldoOpcao[]>;
  maquinas: Opcao[];
  centros: Centro[];
  hoje: string;
}) {
  const [estado, acao, pendente] = useActionState(registrarSaida, INICIAL);
  const v = estado.valores ?? {};
  const [produtoId, setProdutoId] = useState(v.produto_id ?? "");
  const [almoxId, setAlmoxId] = useState(v.almoxarifado_id ?? "");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>((TIPOS as readonly string[]).includes(v.tipo ?? "") ? (v.tipo as (typeof TIPOS)[number]) : "manutencao");
  const [quantidade, setQuantidade] = useState(v.quantidade ?? "");
  // Depois de gravar, a quantidade limpa (produto, almoxarifado e tipo ficam para a próxima).
  const [versaoVista, setVersaoVista] = useState(estado.versao);
  if (estado.versao !== versaoVista) {
    setVersaoVista(estado.versao);
    if (estado.ok) setQuantidade("");
  }

  const opcoesAlmox = saldos[produtoId] ?? [];
  const almoxEscolhido = opcoesAlmox.find((o) => (o.almoxId ?? "sem") === almoxId) ?? opcoesAlmox[0];
  const almoxValor = almoxEscolhido ? almoxEscolhido.almoxId ?? "sem" : "";
  const prod = produtos.find((p) => p.id === produtoId);
  const q = lerQuantidade(quantidade);
  const estimativa = q !== null && almoxEscolhido?.custoMedio != null ? q * almoxEscolhido.custoMedio : null;
  const exige = EXIGE[tipo];

  const trocarProduto = (id: string) => {
    setProdutoId(id);
    const ops = saldos[id] ?? [];
    const melhor = [...ops].sort((a, b) => b.saldo - a.saldo)[0];
    setAlmoxId(melhor ? melhor.almoxId ?? "sem" : "");
  };

  return (
    <form key={estado.versao} action={acao} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor="sd-produto" className={rotuloCampo}>Produto</label>
          <select id="sd-produto" name="produto_id" required value={produtoId} onChange={(e) => trocarProduto(e.target.value)} className={campo}>
            <option value="" disabled>Escolha o produto</option>
            {produtos.map((p) => {
              const total = (saldos[p.id] ?? []).reduce((s, o) => s + o.saldo, 0);
              return <option key={p.id} value={p.id}>{p.nome} — {qtd(total)}{p.unidade ? ` ${p.unidade}` : ""}</option>;
            })}
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor="sd-almox" className={rotuloCampo}>Sai de</label>
          <select id="sd-almox" name="almoxarifado_id" value={almoxValor} onChange={(e) => setAlmoxId(e.target.value)} className={campo} disabled={opcoesAlmox.length === 0}>
            {opcoesAlmox.length === 0 && <option value="">{produtoId ? "Sem saldo em nenhum almoxarifado" : "Escolha o produto"}</option>}
            {opcoesAlmox.map((o) => <option key={o.almoxId ?? "sem"} value={o.almoxId ?? "sem"}>{o.almoxNome} — {qtd(o.saldo)}{prod?.unidade ? ` ${prod.unidade}` : ""}</option>)}
          </select>
          {/* select desabilitado não vai no form: o servidor responde "sem saldo" com a opção de motivo. */}
          {opcoesAlmox.length === 0 && <input type="hidden" name="almoxarifado_id" value="" />}
        </div>
      </div>

      <fieldset>
        <legend className={rotuloCampo}>Tipo de saída</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TIPOS.map((t) => (
            <label key={t} className={`flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2.5 text-center text-[.84rem] font-semibold transition focus-within:ring-2 focus-within:ring-[var(--primary)]/30 ${
              tipo === t ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-hover)]" : "border-[var(--border)] bg-white text-[var(--text-secondary)]"}`}>
              <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="sr-only" />
              {t === "ajuste" ? "Ajuste" : DESTINO_NOME[t]}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-[.78rem] text-[var(--text-muted)]">
          {DICA[tipo]} Abastecimento de máquina?{" "}
          <Link href="/gestao/maquinas#abastecer" className="font-semibold text-[var(--primary-hover)] underline underline-offset-2">Registre em Máquinas e diesel</Link>: a saída do tanque sai junto.
        </p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor="sd-qtd" className={rotuloCampo}>Quantidade{prod?.unidade ? ` (${prod.unidade})` : ""}</label>
          <input id="sd-qtd" name="quantidade" required inputMode="decimal" autoComplete="off" value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)} placeholder="Ex.: 12" className={campo} aria-describedby="sd-qtd-dica" />
          <p id="sd-qtd-dica" className="mt-1.5 text-[.78rem] text-[var(--text-muted)]">
            {almoxEscolhido
              ? `Disponível: ${qtd(almoxEscolhido.saldo)}${prod?.unidade ? ` ${prod.unidade}` : ""} · custo médio ${custoUnit(almoxEscolhido.custoMedio, prod?.unidade)}${estimativa !== null ? ` · esta saída ≈ ${brl(estimativa)}` : ""}`
              : "O custo da saída é o custo médio do produto no almoxarifado."}
          </p>
        </div>
        <div className="min-w-0">
          <label htmlFor="sd-data" className={rotuloCampo}>Data</label>
          <input id="sd-data" name="data" type="date" max={hoje} defaultValue={v.data || hoje} className={campo} />
        </div>
      </div>

      {exige.maquina && (
        <div>
          <label htmlFor="sd-maq" className={rotuloCampo}>Máquina</label>
          <select id="sd-maq" name="maquina_id" required defaultValue={v.maquina_id ?? ""} className={campo}>
            <option value="" disabled>Escolha a máquina</option>
            {maquinas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </div>
      )}
      {tipo !== "ajuste" && (
        <div>
          <label htmlFor="sd-cc" className={rotuloCampo}>
            Centro de custo {exige.centro ? "" : <span className="font-normal text-[var(--text-muted)]">(opcional)</span>}
          </label>
          <select id="sd-cc" name="centro_id" required={exige.centro} defaultValue={v.centro_id ?? ""} className={campo}>
            <option value="">{exige.centro ? "Escolha o centro" : "Sem centro de custo"}</option>
            {ORDEM_SETOR.map((s) => {
              const itens = centros.filter((c) => atividade(c.atividade).setor === s);
              return itens.length === 0 ? null : (
                <optgroup key={s} label={SETOR_NOME[s]}>
                  {itens.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </optgroup>
              );
            })}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="sd-motivo" className={rotuloCampo}>
          Motivo {exige.motivo || estado.semSaldo !== undefined ? "" : <span className="font-normal text-[var(--text-muted)]">(opcional)</span>}
        </label>
        <textarea id="sd-motivo" name="motivo" rows={2} maxLength={300} required={exige.motivo} defaultValue={v.motivo ?? ""} className={campo}
          placeholder={tipo === "ajuste" ? "Ex.: contagem de 30/11, 2 frascos vencidos" : "Ex.: troca de óleo do Trator 1"} />
      </div>

      <div aria-live="polite" className="space-y-3">
        {estado.erro && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-[.88rem] text-red-700">{estado.erro}</p>}
        {estado.ok && <p role="status" className="rounded-xl bg-[var(--primary-soft)] px-4 py-3 text-[.88rem] font-semibold text-[var(--primary-hover)]">{estado.ok}</p>}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" disabled={pendente} className={`${btnPrimario} w-full sm:w-auto`}>
          {pendente ? "Registrando…" : "Registrar saída"}
        </button>
        {estado.semSaldo !== undefined && (
          <button type="submit" name="forcar" value="1" disabled={pendente} className={`${btnSecundario} w-full sm:w-auto`}>
            Registrar mesmo assim (com motivo)
          </button>
        )}
      </div>
    </form>
  );
}
