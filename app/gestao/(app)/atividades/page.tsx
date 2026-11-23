import type { Metadata } from "next";
import Link from "next/link";
import { contextoGestao, tabelaAusente } from "@/lib/gestao/contexto";
import { ATIVIDADES, CENTRO_TIPO_NOME, SETOR_NOME, type CentroTipo, type Setor } from "@/lib/gestao/atividades";
import { brl, hojeISO, limitesDoMes, num } from "@/lib/gestao/format";
import {
  mesDaQuery, resultadoPorCentro, toNum,
  type AbastecimentoRow, type CentroRow, type LinhaResultado, type TituloRow,
} from "@/lib/gestao/resultado";
import { Cartao, EmAtivacao, Selo, Tabela, Titulo, Vazio, btnPrimario, td, th } from "../ui";
import SeletorMes from "../fechamento/SeletorMes";
import NovoCentroForm from "./NovoCentroForm";
import { criarCentro } from "./actions";

export const metadata: Metadata = { title: "Atividades" };
export const dynamic = "force-dynamic";

const SETORES: Setor[] = ["pecuaria", "agricultura", "apoio"];

type Params = { mes?: string; ok?: string; erro?: string };

export default async function Atividades({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const { supabase, clientId } = await contextoGestao();
  const mes = mesDaQuery(sp.mes, hojeISO());
  const periodo = limitesDoMes(mes);

  const centrosQ = await supabase
    .from("centros_custo")
    .select("id, nome, tipo, atividade, cultura, safra, area_ha, cabecas")
    .eq("client_id", clientId).eq("ativo", true).order("nome");

  if (tabelaAusente(centrosQ.error)) {
    return (
      <div>
        <Titulo titulo="Atividades" subtitulo="Centros de custo e resultado por atividade" />
        <EmAtivacao modulo="Centros de custo" />
      </div>
    );
  }
  if (centrosQ.error) throw new Error("Falha ao carregar centros de custo.");

  const [titulosQ, abastQ] = await Promise.all([
    supabase.from("titulos_financeiros").select("tipo, valor, status, vencimento, data_baixa, valor_baixa, centro_custo_id, natureza")
      .eq("client_id", clientId).neq("status", "cancelado")
      .gte("vencimento", periodo.inicio).lte("vencimento", periodo.fim).limit(5000),
    supabase.from("abastecimentos").select("data, litros, preco_litro, centro_custo_id")
      .eq("client_id", clientId).gte("data", periodo.inicio).lte("data", periodo.fim).limit(5000),
  ]);

  const centros = (centrosQ.data ?? []) as unknown as CentroRow[];
  const titulos = (titulosQ.error ? [] : titulosQ.data ?? []) as unknown as TituloRow[];
  const abast = (abastQ.error ? [] : abastQ.data ?? []) as unknown as AbastecimentoRow[];
  const r = resultadoPorCentro(centros, titulos, abast, periodo);

  const porAtividade = new Map<string, LinhaResultado[]>();
  for (const l of r.linhas) {
    const k = l.centro.atividade;
    porAtividade.set(k, [...(porAtividade.get(k) ?? []), l]);
  }

  const temSemCentro = r.semCentro.custo > 0 || r.semCentro.receita > 0;

  return (
    <div>
      <Titulo
        titulo="Atividades"
        subtitulo="Cada centro de custo reúne as contas e o diesel de uma parte da fazenda."
        acao={<Link href="#novo" className={btnPrimario}>Novo centro</Link>}
      />

      {sp.ok && (
        <p role="status" className="mb-4 rounded-xl bg-[var(--primary-soft)] px-4 py-3 text-[.85rem] font-medium text-[var(--primary-hover)]">
          Centro salvo.
        </p>
      )}

      <SeletorMes caminho="/gestao/atividades" mes={mes} id="mes-atividades" />

      {centros.length === 0 ? (
        <Vazio
          titulo="Nenhum centro cadastrado"
          texto="Cadastre o primeiro lote, talhão ou galpão para ver custo e margem por atividade."
        />
      ) : (
        <div className="space-y-6">
          {SETORES.map((setor) => {
            const atividades = ATIVIDADES.filter((a) => a.setor === setor && porAtividade.has(a.codigo));
            if (atividades.length === 0) return null;
            return (
              <Cartao key={setor} titulo={SETOR_NOME[setor]}>
                <div className="space-y-8">
                  {atividades.map((a) => (
                    <section key={a.codigo} aria-label={a.nome}>
                      <div className="mb-3">
                        <h3 className="text-[.95rem] font-semibold text-[var(--text-primary)]">{a.nome}</h3>
                        <p className="text-[.78rem] text-[var(--text-muted)]">
                          {a.unidadeVenda !== "—" ? `Vende em ${a.unidadeVenda} · ${a.indicadorCusto}` : a.indicadorCusto}
                          {a.setor === "agricultura" && " · a receita entra na colheita e na venda da safra"}
                        </p>
                      </div>
                      <Tabela>
                        <thead>
                          <tr>
                            <th className={th} scope="col">Centro</th>
                            <th className={`${th} text-right`} scope="col">{a.base === "hectares" ? "Área" : a.base === "cabecas" ? "Cabeças" : "Base"}</th>
                            <th className={`${th} text-right`} scope="col">Custo</th>
                            <th className={`${th} text-right`} scope="col">Receita</th>
                            <th className={`${th} text-right`} scope="col">Margem</th>
                            <th className={`${th} text-right`} scope="col">Custo por base</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(porAtividade.get(a.codigo) ?? []).map((l) => (
                            <tr key={l.centro.id}>
                              <td className={td}>
                                <span className="block font-medium">{l.centro.nome}</span>
                                <span className="block text-[.75rem] text-[var(--text-muted)]">
                                  {[CENTRO_TIPO_NOME[l.centro.tipo as CentroTipo] ?? l.centro.tipo, l.centro.cultura, l.centro.safra && `safra ${l.centro.safra}`]
                                    .filter(Boolean).join(" · ")}
                                </span>
                              </td>
                              <td className={`${td} text-right tabular-nums`}>
                                {a.base === "hectares" && toNum(l.centro.area_ha) > 0 ? `${num(l.centro.area_ha)} ha`
                                  : a.base === "cabecas" && toNum(l.centro.cabecas) > 0 ? `${num(l.centro.cabecas)} cab.` : "—"}
                              </td>
                              <td className={`${td} text-right tabular-nums`}>
                                {brl(l.custo)}
                                {l.custoDiesel > 0 && (
                                  <span className="block text-[.72rem] text-[var(--text-muted)]">diesel {brl(l.custoDiesel)}</span>
                                )}
                              </td>
                              <td className={`${td} text-right tabular-nums`}>{brl(l.receita)}</td>
                              <td className={`${td} text-right font-semibold tabular-nums ${l.margem < 0 ? "text-[var(--danger)]" : ""}`}>
                                {brl(l.margem)}
                              </td>
                              <td className={`${td} text-right tabular-nums`}>
                                {l.porBase ? `${brl(l.porBase.valor)} / ${l.porBase.unidade}` : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Tabela>
                    </section>
                  ))}
                </div>
              </Cartao>
            );
          })}

          {temSemCentro && (
            <Cartao titulo="Sem centro de custo" acao={<Selo tom="alerta">Para classificar</Selo>}>
              <p className="text-[.88rem] text-[var(--text-secondary)]">
                Custo de <strong className="tabular-nums">{brl(r.semCentro.custo)}</strong> e receita de{" "}
                <strong className="tabular-nums">{brl(r.semCentro.receita)}</strong> neste mês ainda não foram ligados a um centro.
              </p>
            </Cartao>
          )}

          <p className="text-[.75rem] text-[var(--text-muted)]">
            Custo: contas a pagar com vencimento no mês, mais o diesel abastecido (litros × preço). Receita: contas a receber com vencimento no mês.
            A compra de diesel não entra como custo: ela vai para o estoque e vira custo quando a máquina abastece.
            Total do mês: custo {brl(r.total.custo)} · receita {brl(r.total.receita)} · margem {brl(r.total.margem)}.
          </p>
        </div>
      )}

      <div id="novo" className="mt-10 scroll-mt-24">
        <Cartao titulo="Novo centro de custo">
          {sp.erro && (
            <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[.85rem] font-medium text-[var(--danger)]">
              {sp.erro.slice(0, 160)}
            </p>
          )}
          <NovoCentroForm action={criarCentro} />
        </Cartao>
      </div>
    </div>
  );
}
