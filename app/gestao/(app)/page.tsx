import Link from "next/link";
import { contextoGestao, tabelaAusente } from "@/lib/gestao/contexto";
import { brl, dataBR, hojeISO, limitesDoMes, num, somaDias } from "@/lib/gestao/format";
import {
  alertaDiesel, classificarVencimentos, resumoCaixa, saudacao, toNum, valorDiesel,
  type AbastecimentoRow, type TituloRow,
} from "@/lib/gestao/resultado";
import { Cartao, Kpi, Selo, Titulo } from "./ui";

export const dynamic = "force-dynamic";

type Tom = "neutro" | "alerta" | "perigo";
type Item = { id: string; tom: Tom; texto: string; detalhe?: string; href: string };

const COLUNAS_TITULO = "tipo, valor, status, vencimento, data_baixa, valor_baixa, centro_custo_id, natureza";

const ATALHOS = [
  { href: "/gestao/notas", titulo: "Importar nota", texto: "XML, PDF ou foto da NF-e" },
  { href: "/gestao/maquinas", titulo: "Registrar abastecimento", texto: "Litros por máquina" },
  { href: "/gestao/financeiro", titulo: "Dar baixa", texto: "Conta paga ou recebida" },
  { href: "/gestao/financeiro/novo", titulo: "Novo lançamento", texto: "Conta a pagar ou a receber" },
];

export default async function Inicio() {
  const { supabase, clientId, clientName } = await contextoGestao();
  const hoje = hojeISO();
  const mes = limitesDoMes(hoje);
  const desdeDiesel = [mes.inicio, somaDias(hoje, -34)].sort()[0];

  const [abertosQ, pagosQ, semCentroQ, abastQ, abastSemCentroQ, notasQ, notasLegQ] = await Promise.all([
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
  ]);

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

  const notas = (notasQ.error ? 0 : notasQ.count ?? 0) + (notasLegQ.error ? 0 : notasLegQ.count ?? 0);
  const titulosSemCentro = semCentroQ.error ? 0 : semCentroQ.count ?? 0;
  const abastSemCentro = abastSemCentroQ.error ? 0 : abastSemCentroQ.count ?? 0;

  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
  const itens: Item[] = [];
  const grupo = (g: { qtd: number; total: number }, id: string, tom: Tom, texto: (q: string) => string) => {
    if (g.qtd > 0) itens.push({ id, tom, texto: texto(String(g.qtd)), detalhe: brl(g.total), href: "/gestao/financeiro" });
  };
  grupo(venc.pagar.vencidos, "pv", "perigo", (q) => `${q} ${q === "1" ? "conta a pagar vencida" : "contas a pagar vencidas"}`);
  grupo(venc.pagar.aVencer, "pa", "alerta", (q) => `${q} ${q === "1" ? "conta a pagar vence" : "contas a pagar vencem"} em 7 dias`);
  grupo(venc.receber.vencidos, "rv", "alerta", (q) => `${q} ${q === "1" ? "conta a receber atrasada" : "contas a receber atrasadas"}`);
  grupo(venc.receber.aVencer, "ra", "neutro", (q) => `${q} ${q === "1" ? "conta a receber vence" : "contas a receber vencem"} em 7 dias`);
  if (notas > 0) {
    itens.push({ id: "nf", tom: "alerta", texto: `${plural(notas, "nota a conferir", "notas a conferir")}`, detalhe: "Confira antes de lançar", href: "/gestao/notas" });
  }
  if (diesel.acima) {
    itens.push({
      id: "dz", tom: "alerta", texto: "Consumo de diesel acima do padrão",
      detalhe: `${num(diesel.litrosUltimos7)} L em 7 dias · média anterior ${num(diesel.mediaSemanalAnterior)} L por semana`,
      href: "/gestao/maquinas",
    });
  }
  if (titulosSemCentro > 0) {
    itens.push({ id: "sc", tom: "neutro", texto: `${plural(titulosSemCentro, "conta", "contas")} do mês sem centro de custo`, detalhe: "Pendência do fechamento", href: "/gestao/fechamento" });
  }
  if (abastSemCentro > 0) {
    itens.push({ id: "ac", tom: "neutro", texto: `${plural(abastSemCentro, "abastecimento", "abastecimentos")} do mês sem centro de custo`, detalhe: "Pendência do fechamento", href: "/gestao/fechamento" });
  }

  const dataExtenso = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "long",
  }).format(new Date(`${hoje}T12:00:00-03:00`));

  const tomSaldo = financeiroAusente ? "neutro" : caixa.saldo < 0 ? "perigo" : "verde";

  return (
    <div>
      <Titulo titulo={`${saudacao()}, ${clientName}`} subtitulo={`${dataExtenso} · ${dataBR(hoje)}`} />

      <section aria-labelledby="atalhos" className="mb-8">
        <h2 id="atalhos" className="sr-only">Ações frequentes</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {ATALHOS.map((a, i) => (
            <Link
              key={a.href}
              href={a.href}
              className={`flex min-h-[96px] flex-col justify-between rounded-2xl border p-4 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
                i === 0
                  ? "border-transparent bg-[var(--primary)] text-white shadow-[var(--shadow-green)] hover:bg-[var(--primary-hover)]"
                  : "border-[var(--border)] bg-white text-[var(--text-primary)] shadow-[var(--shadow-soft)] hover:bg-[var(--surface-soft)]"
              }`}
            >
              <span className="text-[.95rem] font-semibold leading-tight">{a.titulo}</span>
              <span className={`mt-2 text-[.75rem] leading-snug ${i === 0 ? "text-white/80" : "text-[var(--text-muted)]"}`}>{a.texto}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <Cartao titulo="Pede atenção" className="lg:col-span-3">
          {financeiroAusente && (
            <p className="mb-3 text-[.82rem] text-[var(--text-muted)]">Contas a pagar e a receber estão em ativação e aparecem aqui assim que ligadas.</p>
          )}
          {itens.length === 0 ? (
            <p className="py-4 text-[.9rem] text-[var(--text-secondary)]">
              Nada pede atenção agora. Contas em dia e nenhuma nota esperando conferência.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {itens.map((it) => (
                <li key={it.id}>
                  <Link
                    href={it.href}
                    className="flex items-center justify-between gap-3 py-3 transition hover:bg-[var(--surface-soft)] focus-visible:outline-2 focus-visible:outline-[var(--primary)] sm:-mx-2 sm:rounded-lg sm:px-2"
                  >
                    <span className="min-w-0">
                      <span className="block text-[.9rem] font-medium text-[var(--text-primary)]">{it.texto}</span>
                      {it.detalhe && <span className="mt-0.5 block text-[.78rem] text-[var(--text-muted)]">{it.detalhe}</span>}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {it.tom !== "neutro" && <Selo tom={it.tom}>{it.tom === "perigo" ? "Vencida" : "Atenção"}</Selo>}
                      <span aria-hidden className="text-[var(--text-muted)]">→</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Cartao>

        <section aria-labelledby="mes" className="lg:col-span-2">
          <h2 id="mes" className="mb-3 text-[.95rem] font-semibold text-[var(--text-primary)]">Neste mês</h2>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-1">
            <Kpi rotulo="Entradas" valor={financeiroAusente ? "—" : brl(caixa.entradas)} detalhe="Recebido" href="/gestao/financeiro" />
            <Kpi rotulo="Saídas" valor={financeiroAusente ? "—" : brl(caixa.saidas)} detalhe="Pago" href="/gestao/financeiro" />
            <Kpi rotulo="Saldo do mês" valor={financeiroAusente ? "—" : brl(caixa.saldo)} tom={tomSaldo} />
            <Kpi
              rotulo="Diesel gasto"
              valor={frotaAusente ? "—" : brl(dieselReais)}
              detalhe={frotaAusente ? "Em ativação" : `${num(dieselLitros)} L`}
              href="/gestao/maquinas"
            />
          </div>
          <p className="mt-3 text-[.75rem] text-[var(--text-muted)]">
            Entradas e saídas contam só o que já teve baixa no mês.
          </p>
        </section>
      </div>
    </div>
  );
}
