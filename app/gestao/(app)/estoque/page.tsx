import Link from "next/link";
import { contextoGestao } from "@/lib/gestao/contexto";
import { brl, hojeISO, somaDias } from "@/lib/gestao/format";
import {
  alertaEstoque, faltaParaMinimo, saldoPorProduto, saldosPorAlmoxarifado, valorPorCategoria, type SaldoProdutoAlmox,
} from "@/lib/gestao/estoque";
import { BotaoLink, Cartao, EmAtivacao, Kpi, Selo, Tabela, Titulo, Vazio, td, th } from "../ui";
import { carregarCadastros, carregarLotes, carregarMovimentos, TIPO_ALMOX_NOME, type Produto } from "./dados";
import { listarNotasParaEntrada } from "./entrada/dados";
import { AbasEstoque, Aviso, Barra, custoUnit, linkTexto, qtd, qtdUn } from "./ui-estoque";

export const metadata = { title: "Estoque" };
export const dynamic = "force-dynamic";

function Passo({ feito, n, children }: { feito: boolean; n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span aria-hidden="true" className={`grid size-7 shrink-0 place-items-center rounded-full text-[.8rem] font-semibold ${feito ? "bg-[var(--primary)] text-white" : "border border-[var(--border-strong)] text-[var(--text-secondary)]"}`}>
        {feito ? "✓" : n}
      </span>
      <div className="min-w-0 pt-0.5 text-[.9rem] text-[var(--text-primary)]">
        <span className="sr-only">{feito ? "Feito: " : "A fazer: "}</span>{children}
      </div>
    </li>
  );
}

function TabelaSaldos({ linhas, produtos }: { linhas: SaldoProdutoAlmox[]; produtos: Map<string, Produto> }) {
  return (
    <>
      <ul className="divide-y divide-[var(--border)] sm:hidden">
        {linhas.map((s) => {
          const p = produtos.get(s.productId);
          return (
            <li key={`${s.productId}-${s.almoxarifadoId}`} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/gestao/estoque/produtos/${s.productId}`} className={`${linkTexto} min-w-0 [overflow-wrap:anywhere]`}>{p?.nome ?? "Produto"}</Link>
                <span className={`shrink-0 font-semibold tabular-nums ${s.saldo < 0 ? "text-[var(--danger)]" : ""}`}>{qtdUn(s.saldo, p?.unidade)}</span>
              </div>
              <p className="mt-0.5 text-[.8rem] text-[var(--text-muted)]">
                {s.saldo > 0 ? `${brl(s.valor)}${s.valorParcial ? " (parcial)" : ""} · médio ${custoUnit(s.custoMedio, p?.unidade)}` : "Saldo negativo: falta lançar a nota"}
              </p>
            </li>
          );
        })}
      </ul>
      <div className="hidden sm:block">
        <Tabela>
          <thead>
            <tr>
              <th className={th}>Produto</th>
              <th className={`${th} text-right`}>Saldo</th>
              <th className={`${th} text-right`}>Custo médio</th>
              <th className={`${th} text-right`}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((s) => {
              const p = produtos.get(s.productId);
              return (
                <tr key={`${s.productId}-${s.almoxarifadoId}`}>
                  <td className={`${td} max-w-[300px]`}>
                    <Link href={`/gestao/estoque/produtos/${s.productId}`} className={`${linkTexto} block truncate`} title={p?.nome}>{p?.nome ?? "Produto"}</Link>
                  </td>
                  <td className={`${td} whitespace-nowrap text-right font-semibold tabular-nums ${s.saldo < 0 ? "text-[var(--danger)]" : ""}`}>{qtdUn(s.saldo, p?.unidade)}</td>
                  <td className={`${td} whitespace-nowrap text-right tabular-nums text-[var(--text-secondary)]`}>{custoUnit(s.custoMedio, p?.unidade)}</td>
                  <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{s.saldo > 0 ? `${brl(s.valor)}${s.valorParcial ? " *" : ""}` : <Selo tom="perigo">Negativo</Selo>}</td>
                </tr>
              );
            })}
          </tbody>
        </Tabela>
      </div>
    </>
  );
}

export default async function EstoquePage() {
  const { supabase, clientId } = await contextoGestao();
  const hoje = hojeISO();
  const [cad, { lotes, falhou: falhouLotes }, notas, movs] = await Promise.all([
    carregarCadastros(supabase, clientId),
    carregarLotes(supabase, clientId),
    listarNotasParaEntrada(supabase, clientId, somaDias(hoje, -90)),
    carregarMovimentos(supabase, clientId, { limite: 2000, desde: somaDias(hoje, -90) }),
  ]);

  const pendentesNotas = notas.ausente ? undefined : notas.notas.filter((n) => n.pendentes > 0).length;
  const cabecalho = (
    <>
      <Titulo
        titulo="Estoque"
        subtitulo="Saldo por almoxarifado, o que está abaixo do mínimo e quanto dinheiro está parado no estoque."
        acao={<><BotaoLink href="/gestao/estoque/entrada">Entrada de notas</BotaoLink><BotaoLink href="/gestao/estoque/saida" primario>Registrar saída</BotaoLink></>}
      />
      <AbasEstoque ativo="saldos" pendentes={pendentesNotas} />
    </>
  );

  if (cad.ausente) {
    return (
      <>
        {cabecalho}
        <EmAtivacao modulo="Estoque por almoxarifado" />
        <p className="mt-4 text-center text-[.85rem] text-[var(--text-muted)]">
          Enquanto isso, o histórico de preço das suas compras está em <Link href="/gestao/estoque/precos" className={linkTexto}>Preços pagos</Link>.
        </p>
      </>
    );
  }

  const produtos = new Map(cad.produtos.map((p) => [p.id, p]));
  const saldos = saldosPorAlmoxarifado(lotes);
  const totais = saldoPorProduto(saldos);
  const valorTotal = saldos.reduce((s, x) => s + x.valor, 0);
  const parcial = saldos.some((s) => s.valorParcial && s.saldo > 0);
  const ativos = cad.produtos.filter((p) => p.ativo);
  const abaixo = ativos
    .map((p) => ({ p, saldo: totais.get(p.id)?.saldo ?? 0 }))
    .filter(({ p, saldo }) => alertaEstoque(saldo, p.minimo, p.maximo) === "abaixo");
  const acima = ativos.filter((p) => alertaEstoque(totais.get(p.id)?.saldo ?? 0, p.minimo, p.maximo) === "acima");
  const negativos = saldos.filter((s) => s.saldo < 0);

  const categoriaDoProduto = new Map(cad.produtos.map((p) => [p.id, p.categoriaId]));
  const nomeCat = new Map(cad.categorias.map((c) => [c.id, c.nome]));
  const imobilizado = valorPorCategoria(saldos, categoriaDoProduto);

  // Compras que passaram pelo estoque (entrada ou aplicação direta da nota) nos últimos 90 dias.
  const daNota = movs.movimentos.filter((m) => m.referenciaTabela === "fiscal_invoices" || m.referenciaTabela === "fiscal_notes");
  const loteFornecedor = new Map(lotes.map((l) => [l.id, l.fornecedor]));
  const gastoCat = new Map<string, number>();
  const gastoForn = new Map<string, number>();
  for (const m of daNota) {
    const v = m.custoTotal ?? 0;
    const cat = (m.productId ? categoriaDoProduto.get(m.productId) : null) ?? "";
    gastoCat.set(cat, (gastoCat.get(cat) ?? 0) + v);
    const f = (m.loteId ? loteFornecedor.get(m.loteId) : null) ?? "Fornecedor não identificado";
    gastoForn.set(f, (gastoForn.get(f) ?? 0) + v);
  }
  const ordenar = (m: Map<string, number>) => [...m.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const topCat = ordenar(gastoCat);
  const topForn = ordenar(gastoForn);
  const maxCat = topCat[0]?.[1] ?? 0;
  const maxForn = topForn[0]?.[1] ?? 0;

  const temCadastros = cad.categorias.length > 0 && cad.almoxarifados.length > 0;
  const almoxComSaldo = cad.almoxarifados
    .map((a) => ({ a, linhas: saldos.filter((s) => s.almoxarifadoId === a.id).sort((x, y) => (produtos.get(x.productId)?.nome ?? "").localeCompare(produtos.get(y.productId)?.nome ?? "", "pt-BR")) }))
    .filter((g) => g.a.ativo || g.linhas.length > 0);
  const semAlmox = saldos.filter((s) => s.almoxarifadoId === null);

  return (
    <>
      {cabecalho}
      <div className="space-y-5">
        {(cad.falhou || falhouLotes || notas.parcial) && <Aviso tom="alerta">Parte dos dados não pôde ser lida agora. Os números abaixo podem estar incompletos.</Aviso>}

        {!temCadastros && (
          <Cartao titulo="Para começar o estoque">
            <ol className="space-y-3">
              <Passo feito={cad.categorias.length > 0} n={1}>
                <Link href="/gestao/estoque/categorias" className={linkTexto}>Categorias</Link>: use a sugestão em 1 clique (sem “Outros”).
              </Passo>
              <Passo feito={cad.almoxarifados.length > 0} n={2}>
                <Link href="/gestao/estoque/almoxarifados" className={linkTexto}>Almoxarifados</Link>: tanque de diesel (com capacidade), peças, insumos.
              </Passo>
              <Passo feito={lotes.length > 0} n={3}>
                <Link href="/gestao/estoque/entrada" className={linkTexto}>Entrada de notas</Link>: cada item vira produto do estoque com o custo da nota.
              </Passo>
            </ol>
          </Cartao>
        )}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Kpi rotulo="Dinheiro parado no estoque" valor={brl(valorTotal)} detalhe={parcial ? "Parcial: há lote sem custo" : `${totais.size} ${totais.size === 1 ? "produto" : "produtos"}`} />
          <Kpi rotulo="Abaixo do mínimo" valor={String(abaixo.length)} tom={abaixo.length > 0 ? "perigo" : "neutro"} detalhe={abaixo.length > 0 ? "Hora de comprar" : "Nada faltando"} />
          <Kpi rotulo="Acima do máximo" valor={String(acima.length)} tom={acima.length > 0 ? "alerta" : "neutro"} detalhe={acima.length > 0 ? "Dinheiro empatado" : undefined} />
          <Kpi rotulo="Notas a conferir" valor={pendentesNotas === undefined ? "—" : String(pendentesNotas)} tom={pendentesNotas ? "alerta" : "neutro"} href="/gestao/estoque/entrada" detalhe="Últimos 90 dias" />
        </div>

        {negativos.length > 0 && (
          <Aviso tom="erro">
            {negativos.length} {negativos.length === 1 ? "produto está" : "produtos estão"} com saldo negativo — saiu mais do que entrou. Quase sempre é nota de compra ainda não lançada.{" "}
            <Link href="/gestao/estoque/entrada" className={linkTexto}>Conferir notas</Link>
          </Aviso>
        )}

        {abaixo.length > 0 && (
          <Cartao titulo="Abaixo do mínimo">
            <ul className="divide-y divide-[var(--border)]">
              {abaixo.map(({ p, saldo }) => (
                <li key={p.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/gestao/estoque/produtos/${p.id}`} className={`${linkTexto} min-w-0 [overflow-wrap:anywhere]`}>{p.nome}</Link>
                  <p className="text-[.85rem] tabular-nums text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--danger)]">{qtdUn(saldo, p.unidade)}</span> de mínimo {qtdUn(p.minimo, p.unidade)} · faltam {qtdUn(faltaParaMinimo(saldo, p.minimo), p.unidade)}
                  </p>
                </li>
              ))}
            </ul>
          </Cartao>
        )}

        {saldos.length === 0 && temCadastros ? (
          <Vazio
            titulo="Estoque vazio"
            texto="Confira a primeira nota de compra: cada item entra no almoxarifado com quantidade e custo."
            acao={<BotaoLink href="/gestao/estoque/entrada" primario>Conferir notas</BotaoLink>}
          />
        ) : (
          almoxComSaldo.map(({ a, linhas }) => {
            const valor = linhas.reduce((s, x) => s + x.valor, 0);
            const litros = a.tipo === "combustivel" ? linhas.reduce((s, x) => s + x.saldo, 0) : null;
            return (
              <Cartao
                key={a.id}
                titulo={a.nome}
                acao={<span className="text-[.82rem] tabular-nums text-[var(--text-muted)]">{TIPO_ALMOX_NOME[a.tipo] ?? a.tipo} · {brl(valor)}</span>}
              >
                {litros !== null && a.capacidadeLitros ? (
                  <div className="mb-4">
                    <div className="mb-1.5 flex items-center justify-between text-[.8rem] text-[var(--text-secondary)]">
                      <span>{qtd(litros)} de {qtd(a.capacidadeLitros)} L</span>
                      <Link href="/gestao/estoque/tanque" className={linkTexto}>Conferir com a régua</Link>
                    </div>
                    <Barra fracao={litros / a.capacidadeLitros} tom={litros < 0 ? "perigo" : "verde"} />
                  </div>
                ) : null}
                {linhas.length === 0 ? (
                  <p className="text-[.88rem] text-[var(--text-muted)]">Sem saldo neste almoxarifado.</p>
                ) : (
                  <TabelaSaldos linhas={linhas} produtos={produtos} />
                )}
              </Cartao>
            );
          })
        )}

        {semAlmox.length > 0 && (
          <Cartao titulo="Sem almoxarifado">
            <p className="mb-3 text-[.82rem] text-[var(--text-muted)]">Lotes que entraram pela aprovação da nota na controladoria, antes do controle por almoxarifado. Eles contam no saldo e saem por Saídas → “Sem almoxarifado”.</p>
            <TabelaSaldos linhas={semAlmox} produtos={produtos} />
          </Cartao>
        )}

        {imobilizado.length > 0 && (
          <Cartao titulo="Dinheiro parado por categoria">
            <ul className="space-y-3">
              {imobilizado.map((c) => (
                <li key={c.categoriaId ?? "sem"}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-[.86rem]">
                    <span className="min-w-0 text-[var(--text-primary)] [overflow-wrap:anywhere]">{c.categoriaId ? nomeCat.get(c.categoriaId) ?? "Categoria" : "Sem categoria"}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{brl(c.valor)}{valorTotal > 0 ? <span className="ml-1.5 font-normal text-[var(--text-muted)]">{Math.round((c.valor / valorTotal) * 100)}%</span> : null}</span>
                  </div>
                  <Barra fracao={valorTotal > 0 ? c.valor / valorTotal : 0} />
                </li>
              ))}
            </ul>
          </Cartao>
        )}

        {(topCat.length > 0 || topForn.length > 0) && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Cartao titulo="Compras por categoria · 90 dias">
              <ul className="space-y-3">
                {topCat.map(([cat, v]) => (
                  <li key={cat || "sem"}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-[.86rem]">
                      <span className="min-w-0 [overflow-wrap:anywhere]">{cat ? nomeCat.get(cat) ?? "Categoria" : "Sem categoria"}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{brl(v)}</span>
                    </div>
                    <Barra fracao={maxCat > 0 ? v / maxCat : 0} />
                  </li>
                ))}
              </ul>
            </Cartao>
            <Cartao titulo="Compras por fornecedor · 90 dias">
              <ul className="space-y-3">
                {topForn.map(([f, v]) => (
                  <li key={f}>
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-[.86rem]">
                      <span className="min-w-0 [overflow-wrap:anywhere]">{f}</span>
                      <span className="shrink-0 font-semibold tabular-nums">{brl(v)}</span>
                    </div>
                    <Barra fracao={maxForn > 0 ? v / maxForn : 0} />
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[.75rem] text-[var(--text-muted)]">Notas que passaram pela entrada do estoque (inclusive aplicação direta).</p>
            </Cartao>
          </div>
        )}
      </div>
    </>
  );
}
