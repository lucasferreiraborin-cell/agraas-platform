import type { Metadata } from "next";
import Link from "next/link";
import { contextoGestao, tabelaAusente } from "@/lib/gestao/contexto";
import { atividade } from "@/lib/gestao/atividades";
import { brl, hojeISO, limitesDoMes, mesPorExtenso, num, somaDias } from "@/lib/gestao/format";
import {
  mesDaQuery, resultadoPorCentro, resumoCaixa, toNum, valorDiesel,
  type AbastecimentoRow, type CentroRow, type TituloRow,
} from "@/lib/gestao/resultado";
import { Cartao, EmAtivacao, Kpi, Selo, Tabela, Titulo, btnPrimario, btnSecundario, td, th } from "../ui";
import SeletorMes from "./SeletorMes";

export const metadata: Metadata = { title: "Fechamento" };
export const dynamic = "force-dynamic";

type Pendencia = { id: string; texto: string; qtd: number; href: string; acao: string };

export default async function Fechamento({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams;
  const { supabase, clientId } = await contextoGestao();
  const hoje = hojeISO();
  const mes = mesDaQuery(sp.mes, hoje);
  const periodo = limitesDoMes(mes);
  const mesQuery = mes.slice(0, 7);
  // Vencido no fechamento: venceu antes de hoje e dentro (ou antes) do mês.
  const venceAte = [periodo.fim, somaDias(hoje, -1)].sort()[0];

  const [titulosQ, vencidosQ, semCentroQ, abastQ, centrosQ, notasQ, notasLegQ] = await Promise.all([
    supabase.from("titulos_financeiros")
      .select("tipo, valor, status, vencimento, data_baixa, valor_baixa, centro_custo_id, natureza")
      .eq("client_id", clientId).neq("status", "cancelado")
      .or(`and(vencimento.gte.${periodo.inicio},vencimento.lte.${periodo.fim}),and(data_baixa.gte.${periodo.inicio},data_baixa.lte.${periodo.fim})`)
      .limit(5000),
    supabase.from("titulos_financeiros").select("id", { count: "exact", head: true })
      .eq("client_id", clientId).eq("status", "aberto").lte("vencimento", venceAte),
    supabase.from("titulos_financeiros").select("id", { count: "exact", head: true })
      .eq("client_id", clientId).neq("status", "cancelado").is("centro_custo_id", null)
      .gte("vencimento", periodo.inicio).lte("vencimento", periodo.fim),
    supabase.from("abastecimentos").select("data, litros, preco_litro, centro_custo_id")
      .eq("client_id", clientId).gte("data", periodo.inicio).lte("data", periodo.fim).limit(5000),
    supabase.from("centros_custo").select("id, nome, tipo, atividade, cultura, safra, area_ha, cabecas")
      .eq("client_id", clientId).eq("ativo", true).order("nome"),
    supabase.from("fiscal_invoices").select("id", { count: "exact", head: true })
      .eq("client_id", clientId).eq("status", "pending_review"),
    supabase.from("fiscal_notes").select("id", { count: "exact", head: true })
      .eq("client_id", clientId).eq("status", "pendente"),
  ]);

  if (tabelaAusente(titulosQ.error) && tabelaAusente(abastQ.error)) {
    return (
      <div>
        <Titulo titulo="Fechamento" subtitulo="Confira o mês e leve o pacote ao contador" />
        <EmAtivacao modulo="Fechamento" />
      </div>
    );
  }

  const titulos = (titulosQ.error ? [] : titulosQ.data ?? []) as unknown as TituloRow[];
  const abast = (abastQ.error ? [] : abastQ.data ?? []) as unknown as AbastecimentoRow[];
  const centros = (centrosQ.error ? [] : centrosQ.data ?? []) as unknown as CentroRow[];
  const cont = (q: { error: unknown; count: number | null }) => (q.error ? 0 : q.count ?? 0);

  const caixa = resumoCaixa(titulos, periodo);
  const r = resultadoPorCentro(centros, titulos, abast, periodo);
  const litros = abast.reduce((s, a) => s + toNum(a.litros), 0);
  const dieselReais = abast.reduce((s, a) => s + valorDiesel(a), 0);

  const pendencias: Pendencia[] = [
    { id: "venc", texto: "Contas vencidas sem baixa", qtd: cont(vencidosQ), href: "/gestao/financeiro", acao: "Dar baixa" },
    { id: "tsc", texto: "Contas sem centro de custo", qtd: cont(semCentroQ), href: "/gestao/financeiro", acao: "Classificar" },
    { id: "asc", texto: "Abastecimentos sem centro de custo", qtd: abast.filter((a) => !a.centro_custo_id).length, href: "/gestao/maquinas", acao: "Classificar" },
    { id: "nf", texto: "Notas a conferir", qtd: cont(notasQ) + cont(notasLegQ), href: "/gestao/notas", acao: "Conferir" },
  ];
  const total = pendencias.reduce((s, p) => s + p.qtd, 0);

  const comMovimento = r.linhas.filter((l) => l.custo > 0 || l.receita > 0);
  const ano = mes.slice(0, 4);

  return (
    <div>
      <Titulo
        titulo="Fechamento"
        subtitulo="Resolva as pendências, confira os totais e leve o pacote ao contador."
        acao={
          <a href={`/gestao/fechamento/exportar?mes=${mesQuery}`} className={btnPrimario}>
            Baixar pacote do contador
          </a>
        }
      />

      <SeletorMes caminho="/gestao/fechamento" mes={mes} id="mes-fechamento" />

      <Cartao
        titulo="Pendências"
        acao={total === 0 ? <Selo tom="verde">Pronto para fechar</Selo> : <Selo tom="alerta">{total} a resolver</Selo>}
        className="mb-6"
      >
        <ul className="divide-y divide-[var(--border)]">
          {pendencias.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[.75rem] font-semibold ${
                    p.qtd === 0 ? "bg-[var(--primary-soft)] text-[var(--primary-hover)]" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {p.qtd === 0 ? "✓" : p.qtd > 99 ? "99+" : p.qtd}
                </span>
                <p className="min-w-0 text-[.9rem] text-[var(--text-primary)]">
                  {p.texto}
                  <span className="sr-only">: {p.qtd === 0 ? "nenhuma" : p.qtd}</span>
                </p>
              </div>
              {p.qtd > 0 && (
                <Link href={p.href} className={`${btnSecundario} shrink-0 !px-3 !py-2`}>{p.acao}</Link>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[.75rem] text-[var(--text-muted)]">
          Contas vencidas contam até hoje, inclusive de meses anteriores.
        </p>
      </Cartao>

      <section aria-labelledby="totais" className="mb-6">
        <h2 id="totais" className="mb-3 text-[.95rem] font-semibold capitalize text-[var(--text-primary)]">
          Totais de {mesPorExtenso(mes)}
        </h2>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
          <Kpi rotulo="Pago" valor={brl(caixa.saidas)} detalhe="Contas pagas no mês" />
          <Kpi rotulo="Recebido" valor={brl(caixa.entradas)} detalhe="Contas recebidas no mês" />
          <Kpi rotulo="Saldo" valor={brl(caixa.saldo)} tom={caixa.saldo < 0 ? "perigo" : "verde"} />
          <Kpi rotulo="Diesel" valor={brl(dieselReais)} detalhe={`${num(litros)} L abastecidos`} />
        </div>
      </section>

      <Cartao titulo="Resultado por centro" className="mb-6">
        {comMovimento.length === 0 && r.semCentro.custo === 0 && r.semCentro.receita === 0 ? (
          <p className="py-2 text-[.9rem] text-[var(--text-muted)]">Sem movimento por centro neste mês.</p>
        ) : (
          <Tabela>
            <thead>
              <tr>
                <th className={th} scope="col">Centro</th>
                <th className={`${th} text-right`} scope="col">Custo</th>
                <th className={`${th} text-right`} scope="col">Receita</th>
                <th className={`${th} text-right`} scope="col">Margem</th>
              </tr>
            </thead>
            <tbody>
              {comMovimento.map((l) => (
                <tr key={l.centro.id}>
                  <td className={td}>
                    <span className="block font-medium">{l.centro.nome}</span>
                    <span className="block text-[.75rem] text-[var(--text-muted)]">{atividade(l.centro.atividade).nome}</span>
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{brl(l.custo)}</td>
                  <td className={`${td} text-right tabular-nums`}>{brl(l.receita)}</td>
                  <td className={`${td} text-right font-semibold tabular-nums ${l.margem < 0 ? "text-[var(--danger)]" : ""}`}>{brl(l.margem)}</td>
                </tr>
              ))}
              {(r.semCentro.custo > 0 || r.semCentro.receita > 0) && (
                <tr>
                  <td className={`${td} italic text-[var(--text-secondary)]`}>Sem centro de custo</td>
                  <td className={`${td} text-right tabular-nums`}>{brl(r.semCentro.custo)}</td>
                  <td className={`${td} text-right tabular-nums`}>{brl(r.semCentro.receita)}</td>
                  <td className={`${td} text-right tabular-nums`}>{brl(r.semCentro.receita - r.semCentro.custo)}</td>
                </tr>
              )}
            </tbody>
          </Tabela>
        )}
        <p className="mt-3 text-[.75rem] text-[var(--text-muted)]">
          Por vencimento no mês, com diesel abastecido incluído no custo.
        </p>
      </Cartao>

      <Cartao titulo="Para o contador">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a href={`/gestao/fechamento/exportar?mes=${mesQuery}`} className={btnPrimario}>
            Pacote do mês (CSV)
          </a>
          <a href={`/api/export/lcdpr?year=${ano}`} className={btnSecundario}>
            Livro caixa (LCDPR) de {ano}
          </a>
        </div>
        <p className="mt-3 text-[.78rem] text-[var(--text-muted)]">
          O pacote traz contas e abastecimentos do mês, com separador “;” e vírgula decimal, prontos para abrir no Excel.
          O livro caixa é anual e usa os lançamentos do módulo fiscal.
        </p>
      </Cartao>
    </div>
  );
}
