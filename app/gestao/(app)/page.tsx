import Link from "next/link";
import { ClipboardCheck, FileUp, Fuel, HandCoins, Plus, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { contextoGestao, tabelaAusente } from "@/lib/gestao/contexto";
import { brl, hojeISO, limitesDoMes, num, somaDias } from "@/lib/gestao/format";
import {
  alertaDiesel, classificarVencimentos, resumoCaixa, saudacao, toNum, valorDiesel,
  type AbastecimentoRow, type TituloRow,
} from "@/lib/gestao/resultado";
import { Kpi, Selo } from "./ui";

export const dynamic = "force-dynamic";

type Tom = "neutro" | "alerta" | "perigo";
type Item = { id: string; tom: Tom; texto: string; detalhe?: string; href: string; acao: string };

const COLUNAS_TITULO = "tipo, valor, status, vencimento, data_baixa, valor_baixa, centro_custo_id, natureza";

const ATALHOS: { href: string; rotulo: string; icon: LucideIcon }[] = [
  { href: "/gestao/notas", rotulo: "Enviar nota", icon: FileUp },
  { href: "/gestao/maquinas", rotulo: "Abastecer", icon: Fuel },
  { href: "/gestao/financeiro", rotulo: "Pagar", icon: Wallet },
  { href: "/gestao/financeiro/novo?tipo=receber", rotulo: "Receber", icon: HandCoins },
  { href: "/gestao/financeiro/novo", rotulo: "Lançar", icon: Plus },
  { href: "/gestao/fechamento", rotulo: "Fechar mês", icon: ClipboardCheck },
];

export default async function Inicio() {
  const { supabase, clientId, clientName } = await contextoGestao();
  const hoje = hojeISO();
  const mes = limitesDoMes(hoje);
  const desdeDiesel = [mes.inicio, somaDias(hoje, -34)].sort()[0];

  const [abertosQ, pagosQ, semCentroQ, abastQ, abastSemCentroQ, notasQ, notasLegQ, prox30Q, centrosQ] = await Promise.all([
    supabase.from("titulos_financeiros").select(COLUNAS_TITULO)
      .eq("client_id", clientId).eq("status", "aberto").lte("vencimento", somaDias(hoje, 7)).limit(1000),
    supabase.from("titulos_financeiros").select(COLUNAS_TITULO)
      .eq("client_id", clientId).eq("status", "pago").gte("data_baixa", mes.inicio).lte("data_baixa", mes.fim).limit(2000),
    supabase.from("titulos_financeiros").select("id", { count: "exact", head: true })
      .eq("client_id", clientId).neq("status", "cancelado").is("centro_custo_id", null)
      .gte("vencimento", mes.inicio).lte("vencimento", mes.fim),
    supabase.from("abastecimentos").select("data, litros, preco_litro, centro_custo_id")
      .eq("client_id", clientId).gte("data", desdeDiesel).lte("data", hoje).limit(3000),
    supabase.from("abastecimentos").select("id", { count: "exact", head: true })
      .eq("client_id", clientId).is("centro_custo_id", null).gte("data", mes.inicio).lte("data", mes.fim),
    supabase.from("fiscal_invoices").select("id", { count: "exact", head: true })
      .eq("client_id", clientId).eq("status", "pending_review"),
    supabase.from("fiscal_notes").select("id", { count: "exact", head: true })
      .eq("client_id", clientId).eq("status", "pendente"),
    supabase.from("titulos_financeiros").select("tipo, valor")
      .eq("client_id", clientId).eq("status", "aberto")
      .gte("vencimento", hoje).lte("vencimento", somaDias(hoje, 30)).limit(2000),
    supabase.from("centros_custo").select("id", { count: "exact", head: true }).eq("client_id", clientId),
  ]);
  // Só convida a configurar quando a tabela existe e o cliente ainda não tem nenhum centro.
  const semConfiguracao = !centrosQ.error && centrosQ.count === 0;

  const financeiroAusente = tabelaAusente(abertosQ.error) || tabelaAusente(pagosQ.error);
  const frotaAusente = tabelaAusente(abastQ.error);

  const abertos = (abertosQ.error ? [] : abertosQ.data ?? []) as unknown as TituloRow[];
  const pagos = (pagosQ.error ? [] : pagosQ.data ?? []) as unknown as TituloRow[];
  const abast = (abastQ.error ? [] : abastQ.data ?? []) as unknown as AbastecimentoRow[];

  const venc = classificarVencimentos(abertos, hoje);
  const caixa = resumoCaixa(pagos, mes);
  const doMes = abast.filter((a) => a.data >= mes.inicio);
  const dieselReais = doMes.reduce((s, a) => s + valorDiesel(a), 0);
  const dieselLitros = doMes.reduce((s, a) => s + toNum(a.litros), 0);
  const diesel = alertaDiesel(abast, hoje);

  const prox30 = (prox30Q.error ? [] : prox30Q.data ?? []) as unknown as { tipo: string; valor: number | string }[];
  const aReceber30 = prox30.filter((t) => t.tipo === "receber").reduce((x, t) => x + toNum(t.valor), 0);
  const aPagar30 = prox30.filter((t) => t.tipo === "pagar").reduce((x, t) => x + toNum(t.valor), 0);
  const saldo30 = aReceber30 - aPagar30;
  const pagarSemana = venc.pagar.aVencer.total;
  const pagarVencido = venc.pagar.vencidos.total;

  const notas = (notasQ.error ? 0 : notasQ.count ?? 0) + (notasLegQ.error ? 0 : notasLegQ.count ?? 0);
  const titulosSemCentro = semCentroQ.error ? 0 : semCentroQ.count ?? 0;
  const abastSemCentro = abastSemCentroQ.error ? 0 : abastSemCentroQ.count ?? 0;

  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
  const itens: Item[] = [];
  const grupo = (g: { qtd: number; total: number }, id: string, tom: Tom, acao: string, href: string, texto: (q: string) => string) => {
    if (g.qtd > 0) itens.push({ id, tom, texto: texto(String(g.qtd)), detalhe: brl(g.total), href, acao });
  };
  grupo(venc.pagar.vencidos, "pv", "perigo", "Pagar", "/gestao/financeiro?tipo=pagar", (q) => `${q} ${q === "1" ? "conta a pagar vencida" : "contas a pagar vencidas"}`);
  grupo(venc.pagar.aVencer, "pa", "alerta", "Ver contas", "/gestao/financeiro?tipo=pagar", (q) => `${q} ${q === "1" ? "conta a pagar vence" : "contas a pagar vencem"} em 7 dias`);
  grupo(venc.receber.vencidos, "rv", "alerta", "Cobrar", "/gestao/financeiro?tipo=receber", (q) => `${q} ${q === "1" ? "conta a receber atrasada" : "contas a receber atrasadas"}`);
  grupo(venc.receber.aVencer, "ra", "neutro", "Ver contas", "/gestao/financeiro?tipo=receber", (q) => `${q} ${q === "1" ? "conta a receber vence" : "contas a receber vencem"} em 7 dias`);
  if (notas > 0) {
    itens.push({ id: "nf", tom: "alerta", texto: `${plural(notas, "nota a conferir", "notas a conferir")}`, detalhe: "Confira antes de lançar", href: "/gestao/notas", acao: "Conferir" });
  }
  if (diesel.acima) {
    itens.push({
      id: "dz", tom: "alerta", texto: "Consumo de diesel acima do padrão",
      detalhe: `${num(diesel.litrosUltimos7)} L em 7 dias · média anterior ${num(diesel.mediaSemanalAnterior)} L por semana`,
      href: "/gestao/maquinas", acao: "Ver diesel",
    });
  }
  if (titulosSemCentro > 0) {
    itens.push({ id: "sc", tom: "neutro", texto: `${plural(titulosSemCentro, "conta", "contas")} do mês sem centro de custo`, detalhe: "Pendência do fechamento", href: "/gestao/fechamento", acao: "Resolver" });
  }
  if (abastSemCentro > 0) {
    itens.push({ id: "ac", tom: "neutro", texto: `${plural(abastSemCentro, "abastecimento", "abastecimentos")} do mês sem centro de custo`, detalhe: "Pendência do fechamento", href: "/gestao/fechamento", acao: "Resolver" });
  }

  const dataExtenso = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "long",
  }).format(new Date(`${hoje}T12:00:00-03:00`));

  const tomSaldo = financeiroAusente ? "neutro" : caixa.saldo < 0 ? "perigo" : "verde";

  const frase = financeiroAusente
    ? "Contas a pagar e a receber estão em ativação."
    : pagarSemana > 0 || pagarVencido > 0
      ? `${pagarSemana > 0 ? `Você tem ${brl(pagarSemana)} para pagar nos próximos 7 dias` : "Nada vence nos próximos 7 dias"}${pagarVencido > 0 ? `, e ${brl(pagarVencido)} já venceram` : ""}.`
      : "Nada a pagar nos próximos 7 dias. Contas em dia.";

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[.85rem] text-[var(--text-secondary)]">{saudacao()}, {clientName}</p>
        <p className="text-[.75rem] text-[var(--text-muted)]">{dataExtenso.charAt(0).toUpperCase() + dataExtenso.slice(1).toLowerCase()}</p>
      </div>

      {semConfiguracao && (
        <Link
          href="/gestao/comecar"
          className="flex items-center justify-between gap-4 rounded-3xl border border-[var(--primary)]/30 bg-[var(--primary-soft)] p-5 transition hover:bg-[var(--primary-soft)]/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        >
          <span className="min-w-0">
            <span className="block text-[1rem] font-semibold text-[var(--primary-hover)]">Configure sua fazenda em 5 minutos</span>
            <span className="mt-0.5 block text-[.85rem] text-[var(--text-secondary)]">Diga o que você produz e o resto se organiza.</span>
          </span>
          <span aria-hidden className="shrink-0 text-[1.25rem] text-[var(--primary-hover)]">→</span>
        </Link>
      )}

      <section aria-labelledby="saldo" className="rounded-3xl bg-[linear-gradient(160deg,var(--sidebar)_0%,var(--sidebar-2)_100%)] p-6 text-white shadow-[var(--shadow-green)] sm:p-8">
        <h1 id="saldo" className="text-[.85rem] font-medium text-white/80">Saldo previsto em 30 dias</h1>
        <p className="mt-2 truncate text-[2.4rem] font-semibold leading-none tracking-[-0.04em] tabular-nums sm:text-[3.2rem]" title={financeiroAusente ? "" : brl(saldo30)}>
          {financeiroAusente ? "—" : brl(saldo30)}
        </p>
        <p className="mt-4 max-w-xl text-[.95rem] leading-snug text-white/90">{frase}</p>
        {!financeiroAusente && (
          <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-white/15 pt-5">
            <div className="min-w-0">
              <dt className="text-[.74rem] text-white/75">A receber</dt>
              <dd className="mt-0.5 truncate text-[1.1rem] font-semibold tabular-nums">{brl(aReceber30)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[.74rem] text-white/75">A pagar</dt>
              <dd className="mt-0.5 truncate text-[1.1rem] font-semibold tabular-nums">{brl(aPagar30)}</dd>
            </div>
          </dl>
        )}
        <Link href="/gestao/financeiro" className="mt-5 inline-flex items-center gap-1.5 rounded-full text-[.85rem] font-semibold text-white underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
          Ver contas <span aria-hidden>→</span>
        </Link>
      </section>

      <section aria-labelledby="atalhos">
        <h2 id="atalhos" className="sr-only">Ações frequentes</h2>
        <ul className="grid grid-cols-3 gap-y-5 sm:grid-cols-6">
          {ATALHOS.map((a) => {
            const Icon = a.icon;
            return (
              <li key={a.rotulo}>
                <Link href={a.href} className="group flex flex-col items-center gap-2 rounded-2xl p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border)] bg-white text-[var(--primary)] shadow-[var(--shadow-soft)] transition group-hover:bg-[var(--primary-soft)] group-active:scale-95">
                    <Icon size={22} strokeWidth={1.9} aria-hidden />
                  </span>
                  <span className="text-center text-[.78rem] font-medium leading-tight text-[var(--text-primary)]">{a.rotulo}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="atencao">
        <h2 id="atencao" className="mb-3 text-[1.05rem] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">Pede atenção</h2>
        {financeiroAusente && (
          <p className="mb-3 text-[.82rem] text-[var(--text-muted)]">Contas a pagar e a receber aparecem aqui assim que forem ligadas.</p>
        )}
        {itens.length === 0 ? (
          <div className="rounded-3xl border border-[var(--border)] bg-white px-6 py-8 text-center shadow-[var(--shadow-soft)]">
            <p className="text-[.95rem] font-semibold text-[var(--text-primary)]">Tudo em dia</p>
            <p className="mx-auto mt-1 max-w-sm text-[.85rem] text-[var(--text-secondary)]">Nenhuma conta atrasada e nenhuma nota esperando conferência.</p>
            <div className="mt-4 flex justify-center">
              <Link href="/gestao/notas" className="inline-flex items-center rounded-full bg-[var(--primary)] px-5 py-2.5 text-[.85rem] font-semibold text-white hover:bg-[var(--primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">Enviar uma nota</Link>
            </div>
          </div>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {itens.map((it) => (
              <li key={it.id}>
                <Link
                  href={it.href}
                  className="flex h-full items-center justify-between gap-3 rounded-3xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-soft)] transition hover:bg-[var(--surface-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] sm:p-5"
                >
                  <span className="min-w-0">
                    {it.tom !== "neutro" && <span className="mb-1.5 block"><Selo tom={it.tom}>{it.tom === "perigo" ? "Vencida" : "Atenção"}</Selo></span>}
                    <span className="block text-[.92rem] font-semibold leading-snug text-[var(--text-primary)]">{it.texto}</span>
                    {it.detalhe && <span className="mt-0.5 block text-[.8rem] tabular-nums text-[var(--text-secondary)]">{it.detalhe}</span>}
                  </span>
                  <span className="shrink-0 rounded-full bg-[var(--primary-soft)] px-3.5 py-2 text-[.8rem] font-semibold text-[var(--primary-hover)]">{it.acao}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="mes">
        <h2 id="mes" className="mb-3 text-[1.05rem] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">Neste mês</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi rotulo="Recebido" valor={financeiroAusente ? "—" : brl(caixa.entradas)} detalhe="Entrou no caixa" href="/gestao/financeiro?tipo=receber" />
          <Kpi rotulo="Pago" valor={financeiroAusente ? "—" : brl(caixa.saidas)} detalhe="Saiu do caixa" href="/gestao/financeiro?tipo=pagar" />
          <Kpi rotulo="Saldo do mês" valor={financeiroAusente ? "—" : brl(caixa.saldo)} tom={tomSaldo} detalhe="Recebido menos pago" href="/gestao/fechamento" />
          <Kpi
            rotulo="Diesel"
            valor={frotaAusente ? "—" : brl(dieselReais)}
            detalhe={frotaAusente ? "Em ativação" : `${num(dieselLitros)} L abastecidos`}
            href="/gestao/maquinas"
          />
        </div>
        <p className="mt-3 text-[.75rem] text-[var(--text-muted)]">Recebido e pago contam só o que já teve baixa no mês.</p>
      </section>
    </div>
  );
}
