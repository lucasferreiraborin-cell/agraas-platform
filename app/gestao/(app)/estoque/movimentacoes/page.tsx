import Link from "next/link";
import { contextoGestao } from "@/lib/gestao/contexto";
import { brl, dataBR, hojeISO, somaDias } from "@/lib/gestao/format";
import { rotuloMovimento, sinalDoMovimento } from "@/lib/gestao/estoque";
import { Cartao, EmAtivacao, Selo, Tabela, Titulo, Vazio, btnSecundario, campo, td, th } from "../../ui";
import { carregarCadastros, carregarCentros, carregarLotes, carregarMaquinasAtivas, carregarMovimentos, type Movimento } from "../dados";
import { estornarEntrada } from "../entrada/actions";
import { AbasEstoque, Aviso, linkTexto, qtdUn, rotuloResponsavel } from "../ui-estoque";

export const metadata = { title: "Movimentações do estoque" };
export const dynamic = "force-dynamic";

type Busca = { tipo?: string; almox?: string; dias?: string; aviso?: string; erro?: string };
const FILTROS: Array<[string, string]> = [["todos", "Tudo"], ["entradas", "Entradas"], ["saidas", "Saídas"], ["ajustes", "Ajustes"]];
const PERIODOS: Array<[string, string]> = [["30", "30 dias"], ["90", "90 dias"], ["365", "12 meses"]];
const ERROS: Record<string, string> = {
  movimentado: "Parte desta entrada já saiu do estoque. Em vez de desfazer, registre um ajuste em Saídas.",
  motivo: "Diga em poucas palavras por que a entrada vai ser desfeita.",
  ativacao: "O estoque ainda está sendo ligado à sua conta. Tente em instantes.",
  estorno: "Não foi possível desfazer agora. Tente de novo.",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function classe(m: Movimento): "entradas" | "saidas" | "ajustes" {
  if (m.destino === "ajuste" || m.tipo === "adjustment" || m.tipo === "loss") return "ajustes";
  return sinalDoMovimento({ destinoTipo: m.destino, movementType: m.tipo }) > 0 ? "entradas" : "saidas";
}

function href(params: Busca, patch: Partial<Busca>): string {
  const sp = new URLSearchParams();
  const final = { ...params, ...patch, aviso: undefined, erro: undefined };
  for (const [k, v] of Object.entries(final)) if (v && !(k === "tipo" && v === "todos") && !(k === "dias" && v === "30")) sp.set(k, v);
  const qs = sp.toString();
  return `/gestao/estoque/movimentacoes${qs ? `?${qs}` : ""}`;
}

export default async function MovimentacoesPage({ searchParams }: { searchParams: Promise<Busca> }) {
  const sp = await searchParams;
  const tipo = FILTROS.some(([k]) => k === sp.tipo) ? sp.tipo! : "todos";
  const dias = PERIODOS.some(([k]) => k === sp.dias) ? sp.dias! : "30";
  const almox = sp.almox && UUID.test(sp.almox) ? sp.almox : undefined;
  const { supabase, clientId, userId } = await contextoGestao();
  const [cad, movs, maquinas, centros, { lotes }] = await Promise.all([
    carregarCadastros(supabase, clientId),
    carregarMovimentos(supabase, clientId, { limite: 300, desde: somaDias(hojeISO(), -Number(dias)), almoxarifadoId: almox }),
    carregarMaquinasAtivas(supabase, clientId),
    carregarCentros(supabase, clientId),
    carregarLotes(supabase, clientId),
  ]);

  const cabecalho = (
    <>
      <Titulo titulo="Movimentações" subtitulo="Toda entrada, saída e ajuste, com quem fez, quando e quanto custou." />
      <AbasEstoque ativo="movimentacoes" />
    </>
  );
  if (cad.ausente || movs.ausente) return <>{cabecalho}<EmAtivacao modulo="Movimentações do estoque" /></>;

  const porProduto = new Map(cad.produtos.map((p) => [p.id, p]));
  const nomeAlmox = new Map(cad.almoxarifados.map((a) => [a.id, a.nome]));
  const nomeMaq = new Map(maquinas.map((m) => [m.id, m.nome]));
  const nomeCentro = new Map(centros.map((c) => [c.id, c.nome]));
  const porLote = new Map(lotes.map((l) => [l.id, l]));
  const lista = movs.movimentos.filter((m) => tipo === "todos" || classe(m) === tipo);

  const onde = (m: Movimento) => {
    const dest = [m.maquinaId ? nomeMaq.get(m.maquinaId) : null, m.centroId ? nomeCentro.get(m.centroId) : null].filter(Boolean).join(" · ");
    const local = m.almoxarifadoId ? nomeAlmox.get(m.almoxarifadoId) ?? "Almoxarifado" : null;
    if (classe(m) === "entradas") return local ?? "Sem almoxarifado";
    return [local, dest].filter(Boolean).join(" → ") || "—";
  };
  const origem = (m: Movimento) => {
    if (m.referenciaTabela === "fiscal_invoices" || m.referenciaTabela === "fiscal_notes") {
      const lote = m.loteId ? porLote.get(m.loteId) : undefined;
      return { texto: lote?.documento ?? "Nota fiscal", href: m.referenciaId ? `/gestao/estoque/entrada/${m.referenciaId}${m.referenciaTabela === "fiscal_notes" ? "?origem=legado" : ""}` : null };
    }
    if (m.referenciaTabela === "abastecimentos") return { texto: "Abastecimento", href: m.maquinaId ? `/gestao/maquinas/${m.maquinaId}` : "/gestao/maquinas" };
    return { texto: m.motivo ?? "—", href: null };
  };
  // Entrada sem nota (sobra/saldo inicial) que ainda não saiu: dá para desfazer aqui.
  const desfazivel = (m: Movimento) => {
    if (m.destino !== "entrada" || m.tipo !== "adjustment" || !m.loteId) return false;
    const l = porLote.get(m.loteId);
    return !!l && l.recebido !== null && l.quantidade === l.recebido;
  };

  return (
    <>
      {cabecalho}
      <div className="space-y-5">
        {sp.aviso === "estornado" && <Aviso tom="ok">Entrada desfeita. A auditoria guarda o registro e o motivo.</Aviso>}
        {sp.erro && <Aviso tom="erro">{ERROS[sp.erro] ?? ERROS.estorno}</Aviso>}
        {movs.falhou && <Aviso tom="alerta">Não foi possível ler as movimentações agora.</Aviso>}

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Filtrar por tipo" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <ul className="flex w-max gap-2">
              {FILTROS.map(([k, nome]) => (
                <li key={k}>
                  <Link href={href(sp, { tipo: k })} aria-current={tipo === k ? "true" : undefined}
                    className={`inline-flex rounded-full px-3.5 py-1.5 text-[.8rem] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
                      tipo === k ? "bg-[var(--text-primary)] text-white" : "border border-[var(--border-strong)] bg-white text-[var(--text-secondary)]"}`}>
                    {nome}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <form className="flex flex-col gap-2 sm:flex-row sm:items-end" action="/gestao/estoque/movimentacoes">
            {tipo !== "todos" && <input type="hidden" name="tipo" value={tipo} />}
            <div>
              <label htmlFor="mv-almox" className="sr-only">Almoxarifado</label>
              <select id="mv-almox" name="almox" defaultValue={almox ?? ""} className={`${campo} sm:w-56`}>
                <option value="">Todos os almoxarifados</option>
                {cad.almoxarifados.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="mv-dias" className="sr-only">Período</label>
              <select id="mv-dias" name="dias" defaultValue={dias} className={`${campo} sm:w-36`}>
                {PERIODOS.map(([k, nome]) => <option key={k} value={k}>{nome}</option>)}
              </select>
            </div>
            <button type="submit" className={btnSecundario}>Filtrar</button>
          </form>
        </div>

        <Cartao titulo={`${lista.length} ${lista.length === 1 ? "movimentação" : "movimentações"}`}>
          {lista.length === 0 ? (
            <Vazio titulo="Nada no período" texto="Entradas de nota, saídas e ajustes aparecem aqui, com o responsável de cada um." />
          ) : (
            <>
              <ul className="divide-y divide-[var(--border)] lg:hidden">
                {lista.map((m) => {
                  const p = m.productId ? porProduto.get(m.productId) : undefined;
                  const sinal = sinalDoMovimento({ destinoTipo: m.destino, movementType: m.tipo });
                  const o = origem(m);
                  return (
                    <li key={m.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 font-semibold text-[var(--text-primary)] [overflow-wrap:anywhere]">{p?.nome ?? "Produto"}</p>
                        <p className={`shrink-0 font-semibold tabular-nums ${sinal > 0 ? "text-[var(--primary)]" : ""}`}>{sinal > 0 ? "+" : "−"}{qtdUn(m.quantidade, p?.unidade)}</p>
                      </div>
                      <p className="mt-0.5 text-[.78rem] text-[var(--text-muted)] [overflow-wrap:anywhere]">
                        {dataBR(m.data)} · {rotuloMovimento({ destinoTipo: m.destino, movementType: m.tipo })} · {onde(m)}
                        {m.custoTotal !== null ? ` · ${brl(m.custoTotal)}` : ""} · {rotuloResponsavel(m.criadoPor, userId)}
                      </p>
                      {o.texto !== "—" && (
                        <p className="mt-0.5 text-[.78rem] text-[var(--text-secondary)] [overflow-wrap:anywhere]">
                          {o.href ? <Link href={o.href} className={linkTexto}>{o.texto}</Link> : o.texto}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="hidden lg:block">
                <Tabela>
                  <thead>
                    <tr>
                      <th className={th}>Data</th>
                      <th className={th}>Movimento</th>
                      <th className={th}>Produto</th>
                      <th className={`${th} text-right`}>Quantidade</th>
                      <th className={th}>Onde</th>
                      <th className={`${th} text-right`}>Custo</th>
                      <th className={th}>Quem</th>
                      <th className={th}>Origem / motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((m) => {
                      const p = m.productId ? porProduto.get(m.productId) : undefined;
                      const sinal = sinalDoMovimento({ destinoTipo: m.destino, movementType: m.tipo });
                      const c = classe(m);
                      const o = origem(m);
                      return (
                        <tr key={m.id}>
                          <td className={`${td} whitespace-nowrap tabular-nums`}>{dataBR(m.data)}</td>
                          <td className={td}><Selo tom={c === "entradas" ? "verde" : c === "ajustes" ? "alerta" : "neutro"}>{rotuloMovimento({ destinoTipo: m.destino, movementType: m.tipo })}</Selo></td>
                          <td className={`${td} max-w-[200px]`}><span className="block truncate font-semibold" title={p?.nome}>{p?.nome ?? "Produto"}</span></td>
                          <td className={`${td} whitespace-nowrap text-right font-semibold tabular-nums ${sinal > 0 ? "text-[var(--primary)]" : ""}`}>{sinal > 0 ? "+" : "−"}{qtdUn(m.quantidade, p?.unidade)}</td>
                          <td className={`${td} max-w-[200px]`}><span className="block truncate" title={onde(m)}>{onde(m)}</span></td>
                          <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{m.custoTotal !== null ? brl(m.custoTotal) : "—"}</td>
                          <td className={`${td} whitespace-nowrap`}>{rotuloResponsavel(m.criadoPor, userId)}</td>
                          <td className={`${td} max-w-[240px]`}>
                            {o.href ? <Link href={o.href} className={`${linkTexto} block truncate`} title={o.texto}>{o.texto}</Link> : <span className="block truncate" title={o.texto}>{o.texto}</span>}
                            {desfazivel(m) && (
                              <details className="mt-1">
                                <summary className="w-fit cursor-pointer rounded text-[.76rem] font-semibold text-[var(--danger)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">Desfazer</summary>
                                <form action={estornarEntrada} className="mt-1.5 flex items-end gap-2">
                                  <input type="hidden" name="lote" value={m.loteId!} />
                                  <input type="hidden" name="voltar" value="/gestao/estoque/movimentacoes" />
                                  <label htmlFor={`mv-mot-${m.id}`} className="sr-only">Motivo</label>
                                  <input id={`mv-mot-${m.id}`} name="motivo" required minLength={3} maxLength={300} placeholder="Motivo" className={`${campo} py-2`} />
                                  <button type="submit" className={`${btnSecundario} px-3 py-2`}>Ok</button>
                                </form>
                              </details>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Tabela>
              </div>
              {movs.movimentos.length >= 300 && <p className="mt-3 text-[.75rem] text-[var(--text-muted)]">Mostrando as 300 mais recentes do período.</p>}
            </>
          )}
        </Cartao>
      </div>
    </>
  );
}
