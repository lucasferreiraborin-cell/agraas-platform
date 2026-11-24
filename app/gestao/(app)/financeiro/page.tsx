import Link from "next/link";
import { contextoGestao, tabelaAusente } from "@/lib/gestao/contexto";
import { brl, dataBR, hojeISO, limitesDoMes, somaDias, diasEntre } from "@/lib/gestao/format";
import { BotaoLink, Cartao, EmAtivacao, Kpi, Titulo, Vazio, btnPrimario, btnSecundario, campo, rotuloCampo } from "../ui";
import { LinhaTitulo, type Titulo as Linha } from "./LinhaTitulo";
import { OpcoesCentro, type CentroOpcao } from "./SelectCentro";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contas a pagar e receber" };

type Busca = { tipo?: string; centro?: string; de?: string; ate?: string; aviso?: string; erro?: string; n?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const LIMITE = 500;

const AVISOS: Record<string, string> = {
  baixa: "Baixa registrada.",
  desfeita: "Baixa desfeita. O título voltou para em aberto.",
};
const ERROS: Record<string, string> = {
  data: "Data da baixa inválida. Use uma data até hoje.",
  valor: "Valor da baixa inválido.",
  parcial: "Baixa parcial ainda não está disponível: informe o valor total do título.",
  forma: "Escolha a forma de pagamento.",
  "nao-encontrado": "Título não encontrado ou já alterado. A lista foi atualizada.",
  falha: "Não foi possível salvar agora. Tente de novo.",
  ativacao: "O módulo ainda está em ativação. Tente em instantes.",
};

type Bruto = Omit<Linha, "centro"> & { centros_custo: { nome: string } | { nome: string }[] | null };
const SEL = "id, tipo, descricao, contraparte_nome, numero_parcela, valor, vencimento, status, data_baixa, valor_baixa, forma_pagamento, origem, centros_custo(nome)";

function paraLinha(b: Bruto): Linha {
  const { centros_custo, ...resto } = b;
  const c = Array.isArray(centros_custo) ? centros_custo[0] : centros_custo;
  return { ...resto, centro: c?.nome ?? null };
}
const soma = (ls: Linha[], campoValor: "valor" | "baixa" = "valor") =>
  ls.reduce((s, t) => s + Number(campoValor === "baixa" ? (t.valor_baixa ?? t.valor) : t.valor), 0);
const curta = (iso: string) => dataBR(iso).slice(0, 5);

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<Busca> }) {
  const sp = await searchParams;
  const tipo: "pagar" | "receber" = sp.tipo === "receber" ? "receber" : "pagar";
  const centroFiltro = sp.centro && UUID.test(sp.centro) ? sp.centro : "";
  const de = sp.de && ISO.test(sp.de) ? sp.de : "";
  const ate = sp.ate && ISO.test(sp.ate) ? sp.ate : "";
  const filtrado = Boolean(centroFiltro || de || ate);

  const ctx = await contextoGestao();
  const { supabase, clientId } = ctx;
  const hoje = hojeISO();
  const { inicio: mesIni, fim: mesFim } = limitesDoMes(hoje);
  const fim7 = somaDias(hoje, 6);
  const fim30 = somaDias(hoje, 29);

  let qAberto = supabase.from("titulos_financeiros").select(SEL)
    .eq("client_id", clientId).eq("tipo", tipo).eq("status", "aberto")
    .order("vencimento").limit(LIMITE);
  let qPago = supabase.from("titulos_financeiros").select(SEL)
    .eq("client_id", clientId).eq("tipo", tipo).eq("status", "pago")
    .gte("data_baixa", mesIni).lte("data_baixa", mesFim)
    .order("data_baixa", { ascending: false }).limit(200);
  if (centroFiltro) { qAberto = qAberto.eq("centro_custo_id", centroFiltro); qPago = qPago.eq("centro_custo_id", centroFiltro); }
  if (de) qAberto = qAberto.gte("vencimento", de);
  if (ate) qAberto = qAberto.lte("vencimento", ate);

  const [rAberto, rPago, rSaldo, rCentros] = await Promise.all([
    qAberto,
    qPago,
    supabase.from("titulos_financeiros").select("tipo, valor, vencimento")
      .eq("client_id", clientId).eq("status", "aberto")
      .gte("vencimento", hoje).lte("vencimento", fim30).limit(2000),
    supabase.from("centros_custo").select("id, nome, atividade")
      .eq("client_id", clientId).eq("ativo", true).order("nome"),
  ]);

  const titulo = (
    <Titulo
      titulo="Contas a pagar e receber"
      subtitulo="O que vence, o que já foi pago e o saldo das próximas semanas."
      acao={<BotaoLink primario href={`/gestao/financeiro/novo?tipo=${tipo}`}>Novo lançamento</BotaoLink>}
    />
  );

  if (tabelaAusente(rAberto.error) || tabelaAusente(rPago.error) || tabelaAusente(rCentros.error)) {
    return (<>{titulo}<EmAtivacao modulo="Contas a pagar e receber" /></>);
  }
  if (rAberto.error || rPago.error) {
    return (
      <>
        {titulo}
        <Vazio titulo="Não foi possível carregar os títulos" texto="Atualize a página em instantes. Se persistir, avise o suporte." />
      </>
    );
  }

  const abertos = ((rAberto.data ?? []) as unknown as Bruto[]).map(paraLinha);
  const pagos = ((rPago.data ?? []) as unknown as Bruto[]).map(paraLinha);
  const centros = ((rCentros.data ?? []) as unknown as CentroOpcao[]);

  const vencidas = abertos.filter((t) => t.vencimento < hoje);
  const semana = abertos.filter((t) => t.vencimento >= hoje && t.vencimento <= fim7);
  const proximas = abertos.filter((t) => t.vencimento > fim7);
  const ate30 = abertos.filter((t) => t.vencimento >= hoje && t.vencimento <= fim30);

  const ehPagar = tipo === "pagar";
  const rotPago = ehPagar ? "Pago no mês" : "Recebido no mês";

  // Saldo projetado: 30 dias em blocos de 7 (o último com 2).
  const blocos = Array.from({ length: 5 }, (_, i) => {
    const ini = somaDias(hoje, i * 7);
    const fimB = i === 4 ? fim30 : somaDias(hoje, i * 7 + 6);
    return { ini, fim: fimB, receber: 0, pagar: 0 };
  });
  const saldoRows = (rSaldo.error ? [] : (rSaldo.data ?? [])) as { tipo: string; valor: number | string; vencimento: string }[];
  for (const r of saldoRows) {
    const i = Math.min(4, Math.floor(diasEntre(hoje, r.vencimento) / 7));
    if (i < 0) continue;
    blocos[i][r.tipo === "receber" ? "receber" : "pagar"] += Number(r.valor);
  }
  const totReceber = blocos.reduce((s, b) => s + b.receber, 0);
  const totPagar = blocos.reduce((s, b) => s + b.pagar, 0);
  const saldo = totReceber - totPagar;
  const maxBarra = Math.max(1, ...blocos.flatMap((b) => [b.receber, b.pagar]));

  const qsVoltar = new URLSearchParams({ tipo });
  if (centroFiltro) qsVoltar.set("centro", centroFiltro);
  if (de) qsVoltar.set("de", de);
  if (ate) qsVoltar.set("ate", ate);
  const voltar = `/gestao/financeiro?${qsVoltar.toString()}`;

  const aviso = sp.aviso === "criado"
    ? `${Number(sp.n) > 1 ? `${Math.min(60, Number(sp.n))} parcelas lançadas` : "Lançamento salvo"}.`
    : sp.aviso ? AVISOS[sp.aviso] : undefined;
  const erro = sp.erro ? ERROS[sp.erro] : undefined;

  const nenhum = abertos.length === 0 && pagos.length === 0;

  const grupos: { nome: string; itens: Linha[]; alerta?: boolean }[] = [
    { nome: "Vencidas", itens: vencidas, alerta: true },
    { nome: "Esta semana", itens: semana },
    { nome: "Próximas", itens: proximas },
    { nome: rotPago === "Pago no mês" ? "Pagas no mês" : "Recebidas no mês", itens: pagos },
  ];

  const aba = (cod: "pagar" | "receber", nome: string) => (
    <Link
      href={`/gestao/financeiro?tipo=${cod}`}
      aria-current={tipo === cod ? "page" : undefined}
      className={`flex-1 rounded-full px-5 py-2.5 text-center text-[.88rem] font-semibold transition focus-visible:outline-2 focus-visible:outline-[var(--primary)] sm:flex-none ${
        tipo === cod ? "bg-white text-[var(--primary-hover)] shadow-[var(--shadow-soft)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      }`}
    >
      {nome}
    </Link>
  );

  return (
    <>
      {titulo}

      {aviso && <p role="status" className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--primary-soft)] px-4 py-3 text-[.85rem] text-[var(--primary-hover)]">{aviso}</p>}
      {erro && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[.85rem] text-red-700">{erro}</p>}

      <nav aria-label="Tipo de conta" className="mb-5 flex gap-1 rounded-full bg-black/5 p-1 sm:inline-flex">
        {aba("pagar", "A pagar")}
        {aba("receber", "A receber")}
      </nav>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi rotulo="Vencido" valor={brl(soma(vencidas))} tom={vencidas.length ? "perigo" : "neutro"}
          detalhe={vencidas.length ? `${vencidas.length} ${vencidas.length === 1 ? "conta atrasada" : "contas atrasadas"}` : "Nada em atraso"} />
        <Kpi rotulo="Próximos 7 dias" valor={brl(soma(semana))} tom={semana.length ? "alerta" : "neutro"}
          detalhe={`${semana.length} ${semana.length === 1 ? "conta" : "contas"}`} />
        <Kpi rotulo="Próximos 30 dias" valor={brl(soma(ate30))}
          detalhe={`${ate30.length} ${ate30.length === 1 ? "conta" : "contas"}, inclui os 7 dias`} />
        <Kpi rotulo={rotPago} valor={brl(soma(pagos, "baixa"))} tom="verde"
          detalhe={`${pagos.length} ${pagos.length === 1 ? "baixa" : "baixas"}`} />
      </div>

      <Cartao titulo="Saldo projetado · próximos 30 dias" className="mb-5">
        {totReceber === 0 && totPagar === 0 ? (
          <p className="text-[.85rem] text-[var(--text-muted)]">Nenhum título a vencer nos próximos 30 dias.</p>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="min-w-0">
                <p className="text-[.74rem] font-medium text-[var(--text-muted)]">A receber</p>
                <p className="truncate text-[1.2rem] font-semibold tabular-nums text-[var(--primary)]" title={brl(totReceber)}>{brl(totReceber)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[.74rem] font-medium text-[var(--text-muted)]">A pagar</p>
                <p className="truncate text-[1.2rem] font-semibold tabular-nums text-[var(--text-primary)]" title={brl(totPagar)}>{brl(totPagar)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[.74rem] font-medium text-[var(--text-muted)]">Saldo</p>
                <p className={`truncate text-[1.2rem] font-semibold tabular-nums ${saldo < 0 ? "text-[var(--danger)]" : "text-[var(--primary)]"}`} title={brl(saldo)}>{brl(saldo)}</p>
              </div>
            </div>
            <ul className="space-y-3">
              {blocos.map((b) => {
                const liquido = b.receber - b.pagar;
                return (
                  <li key={b.ini}>
                    <div className="flex items-baseline justify-between gap-3 text-[.78rem]">
                      <span className="text-[var(--text-secondary)]">{curta(b.ini)} a {curta(b.fim)}</span>
                      <span className={`tabular-nums font-semibold ${liquido < 0 ? "text-[var(--danger)]" : "text-[var(--text-primary)]"}`}>
                        {brl(liquido)}
                      </span>
                    </div>
                    <div className="mt-1.5 space-y-1" aria-hidden="true">
                      <div className="h-2 rounded-full bg-black/5"><div className="h-2 rounded-full bg-[var(--primary)]" style={{ width: `${(b.receber / maxBarra) * 100}%` }} /></div>
                      <div className="h-2 rounded-full bg-black/5"><div className="h-2 rounded-full bg-[var(--danger)] opacity-70" style={{ width: `${(b.pagar / maxBarra) * 100}%` }} /></div>
                    </div>
                    <p className="sr-only">A receber {brl(b.receber)}, a pagar {brl(b.pagar)}.</p>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[.75rem] text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--primary)]" />A receber</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--danger)] opacity-70" />A pagar</span>
              <span>Títulos vencidos não entram.</span>
            </p>
          </>
        )}
      </Cartao>

      <form method="get" className="mb-5 rounded-3xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-soft)] sm:p-5">
        <input type="hidden" name="tipo" value={tipo} />
        <div className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <div>
            <label htmlFor="f-centro" className={rotuloCampo}>Centro de custo</label>
            <select id="f-centro" name="centro" defaultValue={centroFiltro} className={campo}>
              <option value="">Todos</option>
              <OpcoesCentro centros={centros} />
            </select>
          </div>
          <div>
            <label htmlFor="f-de" className={rotuloCampo}>Vence a partir de</label>
            <input id="f-de" name="de" type="date" defaultValue={de} className={campo} />
          </div>
          <div>
            <label htmlFor="f-ate" className={rotuloCampo}>Vence até</label>
            <input id="f-ate" name="ate" type="date" defaultValue={ate} className={campo} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className={`${btnPrimario} flex-1`}>Filtrar</button>
            {filtrado && <Link href={`/gestao/financeiro?tipo=${tipo}`} className={btnSecundario}>Limpar</Link>}
          </div>
        </div>
        {filtrado && <p className="mt-3 text-[.78rem] text-[var(--text-muted)]">Filtro ativo nos totais e nas listas acima. O saldo projetado considera todos os títulos.</p>}
      </form>

      {nenhum ? (
        filtrado ? (
          <Vazio titulo="Nada encontrado neste filtro" texto="Ajuste o centro ou o período para ver outros títulos."
            acao={<Link href={`/gestao/financeiro?tipo=${tipo}`} className={btnSecundario}>Limpar filtro</Link>} />
        ) : (
          <Vazio
            titulo={ehPagar ? "Nenhuma conta a pagar" : "Nenhuma conta a receber"}
            texto={ehPagar
              ? "As parcelas das notas de compra entram aqui sozinhas. Você também pode lançar uma conta à mão."
              : "Registre vendas e valores a receber para acompanhar o fluxo das próximas semanas."}
            acao={<BotaoLink primario href={`/gestao/financeiro/novo?tipo=${tipo}`}>Novo lançamento</BotaoLink>}
          />
        )
      ) : (
        <div className="space-y-5">
          {grupos.map((g) => (
            <Cartao
              key={g.nome}
              titulo={`${g.nome} (${g.itens.length})`}
              acao={g.itens.length ? <span className={`text-[.88rem] font-semibold tabular-nums ${g.alerta ? "text-[var(--danger)]" : "text-[var(--text-secondary)]"}`}>{brl(soma(g.itens, g.nome.includes("no mês") ? "baixa" : "valor"))}</span> : undefined}
            >
              {g.itens.length === 0 ? (
                <p className="text-[.85rem] text-[var(--text-muted)]">Nada por aqui.</p>
              ) : (
                <ul className="divide-y divide-[var(--border)]">
                  {g.itens.map((t) => <LinhaTitulo key={t.id} t={t} hoje={hoje} voltar={voltar} />)}
                </ul>
              )}
            </Cartao>
          ))}
          {abertos.length >= LIMITE && (
            <p className="text-[.78rem] text-[var(--text-muted)]">Mostrando os {LIMITE} primeiros títulos em aberto. Use o filtro para ver os demais.</p>
          )}
        </div>
      )}
    </>
  );
}
