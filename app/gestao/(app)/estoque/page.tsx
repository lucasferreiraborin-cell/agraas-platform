import Link from "next/link";
import { contextoGestao, tabelaAusente, type GestaoContexto } from "@/lib/gestao/contexto";
import { brl, dataBR, diasEntre, hojeISO, num } from "@/lib/gestao/format";
import {
  direcaoPorCfop, historicoDePrecos, resumoEstoque,
  type CompraItem, type HistoricoPreco, type LoteEstoque,
} from "@/lib/gestao/insumos";
import { Cartao, EmAtivacao, Kpi, Selo, Tabela, Titulo, Vazio, td, th } from "../ui";

export const metadata = { title: "Insumos" };

export const dynamic = "force-dynamic";

type Db = GestaoContexto["supabase"];
type Registro = Record<string, string | number | null | undefined>;

const um = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
const numero = (v: unknown): number | null => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const pct = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

/** Compras (itens de notas de entrada) do cliente, nas duas tabelas fiscais, sem contar a mesma nota duas vezes. */
async function carregarCompras(supabase: Db, clientId: string): Promise<{ compras: CompraItem[]; falhou: boolean }> {
  const [canon, leg] = await Promise.all([
    supabase
      .from("fiscal_invoice_items")
      .select("fiscal_invoice_id, description, unit, unit_price, fiscal_invoices!inner(issued_at, issuer_name, direction, client_id)")
      .eq("fiscal_invoices.client_id", clientId)
      .eq("fiscal_invoices.direction", "entrada")
      .order("created_at", { ascending: false })
      .limit(2000),
    supabase
      .from("fiscal_note_items")
      .select("note_id, descricao, unidade, valor_unitario, cfop, fiscal_notes!inner(data_emissao, emitente_nome, client_id)")
      .eq("fiscal_notes.client_id", clientId)
      .limit(2000),
  ]);

  const falhou = (!!canon.error && !tabelaAusente(canon.error)) || (!!leg.error && !tabelaAusente(leg.error));
  if (falhou) console.error("[gestao/estoque] compras:", canon.error?.message, leg.error?.message);

  const compras: CompraItem[] = [];
  const notasCanonicas = new Set<string>();

  for (const r of (canon.error ? [] : (canon.data ?? [])) as unknown as Array<Registro & { fiscal_invoices: Registro | Registro[] | null }>) {
    const nf = um(r.fiscal_invoices);
    const preco = numero(r.unit_price);
    if (!nf || preco === null || !r.description) continue;
    const notaId = String(r.fiscal_invoice_id ?? "");
    notasCanonicas.add(notaId);
    compras.push({
      descricao: String(r.description), unidade: (r.unit as string | null) ?? null, preco,
      data: nf.issued_at ? String(nf.issued_at).slice(0, 10) : null,
      fornecedor: (nf.issuer_name as string | null) ?? null, notaId,
    });
  }

  for (const r of (leg.error ? [] : (leg.data ?? [])) as unknown as Array<Registro & { fiscal_notes: Registro | Registro[] | null }>) {
    const nf = um(r.fiscal_notes);
    const preco = numero(r.valor_unitario);
    const notaId = String(r.note_id ?? "");
    if (!nf || preco === null || !r.descricao || notasCanonicas.has(notaId)) continue;
    if (direcaoPorCfop(r.cfop as string | null) === "saida") continue; // venda não é compra de insumo
    compras.push({
      descricao: String(r.descricao), unidade: (r.unidade as string | null) ?? null, preco,
      data: nf.data_emissao ? String(nf.data_emissao).slice(0, 10) : null,
      fornecedor: (nf.emitente_nome as string | null) ?? null, notaId,
    });
  }
  return { compras, falhou };
}

async function carregarLotes(supabase: Db, clientId: string): Promise<{ lotes: LoteEstoque[]; ausente: boolean; falhou: boolean }> {
  const [lotesRes, prodRes] = await Promise.all([
    supabase.from("stock_batches").select("*").eq("client_id", clientId).limit(2000),
    supabase.from("products").select("id, name, unit").eq("client_id", clientId).limit(2000),
  ]);
  if (tabelaAusente(lotesRes.error)) return { lotes: [], ausente: true, falhou: false };
  if (lotesRes.error) {
    console.error("[gestao/estoque] lotes:", lotesRes.error.message);
    return { lotes: [], ausente: false, falhou: true };
  }
  const produtos = new Map<string, { nome: string; unidade: string | null }>();
  for (const p of (prodRes.error ? [] : (prodRes.data ?? [])) as unknown as Registro[]) {
    produtos.set(String(p.id), { nome: String(p.name ?? "Produto"), unidade: (p.unit as string | null) ?? null });
  }
  const lotes = ((lotesRes.data ?? []) as unknown as Registro[]).map<LoteEstoque>((l) => {
    const prod = l.product_id ? produtos.get(String(l.product_id)) : undefined;
    return {
      productId: l.product_id ? String(l.product_id) : null,
      nome: prod?.nome ?? (l.supplier_name as string | null) ?? (l.batch_number as string | null) ?? "Item sem cadastro",
      unidade: prod?.unidade ?? null,
      quantidade: numero(l.quantity_available) ?? numero(l.quantity) ?? 0,
      custoUnit: numero(l.unit_cost),
      validade: l.expiration_date ? String(l.expiration_date).slice(0, 10) : null,
    };
  });
  return { lotes, ausente: false, falhou: !!prodRes.error && !tabelaAusente(prodRes.error) };
}

function Variacao({ h }: { h: HistoricoPreco }) {
  if (h.variacao === null || !h.sentido) return <span className="text-[var(--text-muted)]">Primeira compra</span>;
  if (h.sentido === "estavel") return <span className="text-[var(--text-secondary)]">Estável ({pct(h.variacao)})</span>;
  const alta = h.sentido === "alta";
  return (
    <span
      className={`font-semibold tabular-nums ${alta ? "text-[var(--danger)]" : "text-[var(--primary)]"}`}
      aria-label={`${alta ? "Subiu" : "Caiu"} ${pct(Math.abs(h.variacao))}`}
    >
      <span aria-hidden="true">{alta ? "▲ +" : "▼ "}</span>{pct(h.variacao).replace("-", "")}
    </span>
  );
}

const preco = (v: number, un: string | null) => `${brl(v)}${un ? ` / ${un}` : ""}`;

export default async function EstoquePage() {
  const { supabase, clientId } = await contextoGestao();
  const [{ lotes, ausente, falhou: falhouLotes }, { compras, falhou: falhouCompras }] = await Promise.all([
    carregarLotes(supabase, clientId),
    carregarCompras(supabase, clientId),
  ]);

  if (ausente) {
    return (
      <>
        <Titulo titulo="Insumos" subtitulo="O que tem no estoque e quanto você pagou." />
        <EmAtivacao modulo="Estoque de insumos" />
      </>
    );
  }

  const estoque = resumoEstoque(lotes);
  const historico = historicoDePrecos(compras);
  const hoje = hojeISO();

  const valorEstoque = estoque.reduce((s, p) => s + p.valor, 0);
  const algumParcial = estoque.some((p) => p.valorParcial);
  const subiram = historico.filter((h) => h.sentido === "alta");
  const maiorAlta = subiram[0];

  return (
    <>
      <Titulo titulo="Insumos" subtitulo="O que tem no estoque e quanto você pagou em cada compra." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <Kpi rotulo="Itens em estoque" valor={String(estoque.length)} />
        <Kpi
          rotulo="Valor em estoque"
          valor={estoque.length === 0 ? "—" : brl(valorEstoque)}
          detalhe={algumParcial ? "Parcial: há lotes sem custo" : undefined}
        />
        <div className="col-span-2 lg:col-span-1">
          <Kpi
            rotulo="Subiram na última compra"
            valor={String(subiram.length)}
            tom={subiram.length > 0 ? "perigo" : "neutro"}
            detalhe={maiorAlta?.variacao != null ? `Maior alta: ${maiorAlta.descricao} (+${pct(maiorAlta.variacao)})` : "Nenhuma alta em vista"}
          />
        </div>
      </div>

      {(falhouLotes || falhouCompras) && (
        <p role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[.83rem] text-amber-800">
          Parte dos dados não pôde ser lida agora. Os números abaixo podem estar incompletos.
        </p>
      )}

      <div className="space-y-5">
        <Cartao titulo="Estoque atual">
          {estoque.length === 0 ? (
            <Vazio
              titulo="Estoque vazio"
              texto="Quando uma nota de compra é conferida, os itens entram aqui com quantidade e custo."
              acao={<Link href="/gestao/notas" className="text-[.85rem] font-semibold text-[var(--primary-hover)] underline underline-offset-2">Enviar uma nota</Link>}
            />
          ) : (
            <>
              <ul className="divide-y divide-[var(--border)] sm:hidden">
                {estoque.map((p) => {
                  const dias = p.proximaValidade ? diasEntre(hoje, p.proximaValidade) : null;
                  return (
                    <li key={p.chave} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 font-semibold text-[var(--text-primary)]">{p.nome}</p>
                        <p className="shrink-0 font-semibold tabular-nums">{num(p.saldo, 2)} {p.unidade ?? ""}</p>
                      </div>
                      <p className="mt-0.5 text-[.8rem] text-[var(--text-muted)]">
                        {p.valor > 0 ? `${brl(p.valor)}${p.valorParcial ? " (parcial)" : ""}` : "Sem custo informado"}
                        {p.proximaValidade ? ` · validade ${dataBR(p.proximaValidade)}` : ""}
                      </p>
                      {dias !== null && dias <= 60 && (
                        <div className="mt-1.5"><Selo tom={dias < 0 ? "perigo" : "alerta"}>{dias < 0 ? "Vencido" : `Vence em ${dias} dias`}</Selo></div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="hidden sm:block">
                <Tabela>
                  <thead>
                    <tr>
                      <th className={th}>Insumo</th>
                      <th className={`${th} text-right`}>Saldo</th>
                      <th className={`${th} text-right`}>Valor</th>
                      <th className={th}>Validade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estoque.map((p) => {
                      const dias = p.proximaValidade ? diasEntre(hoje, p.proximaValidade) : null;
                      return (
                        <tr key={p.chave}>
                          <td className={`${td} max-w-[280px]`}>
                            <span className="block truncate font-semibold" title={p.nome}>{p.nome}</span>
                            <span className="text-[.78rem] text-[var(--text-muted)]">{p.lotes} {p.lotes === 1 ? "lote" : "lotes"}</span>
                          </td>
                          <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{num(p.saldo, 2)} {p.unidade ?? ""}</td>
                          <td className={`${td} whitespace-nowrap text-right tabular-nums`}>
                            {p.valor > 0 ? `${brl(p.valor)}${p.valorParcial ? " *" : ""}` : "—"}
                          </td>
                          <td className={`${td} whitespace-nowrap`}>
                            {p.proximaValidade ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="tabular-nums">{dataBR(p.proximaValidade)}</span>
                                {dias !== null && dias <= 60 && <Selo tom={dias < 0 ? "perigo" : "alerta"}>{dias < 0 ? "Vencido" : `${dias} dias`}</Selo>}
                              </span>
                            ) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Tabela>
                {algumParcial && <p className="mt-2 text-[.75rem] text-[var(--text-muted)]">* Valor parcial: há lotes sem custo informado.</p>}
              </div>
            </>
          )}
        </Cartao>

        <Cartao titulo="Quanto você pagou em cada compra">
          {historico.length === 0 ? (
            <Vazio
              titulo="Sem compras para comparar"
              texto="Com duas notas do mesmo produto, mostramos se o preço subiu e de quanto. Assim a alta na revenda não passa batida."
              acao={<Link href="/gestao/notas" className="text-[.85rem] font-semibold text-[var(--primary-hover)] underline underline-offset-2">Enviar uma nota</Link>}
            />
          ) : (
            <>
              <ul className="divide-y divide-[var(--border)] sm:hidden">
                {historico.map((h) => (
                  <li key={h.chave} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 font-semibold text-[var(--text-primary)]">{h.descricao}</p>
                      <p className="shrink-0 text-[.85rem]"><Variacao h={h} /></p>
                    </div>
                    <p className="mt-0.5 font-semibold tabular-nums">{preco(h.ultimo.preco, h.unidade)}</p>
                    <p className="mt-0.5 text-[.8rem] text-[var(--text-muted)]">
                      {h.ultimo.fornecedor ?? "Fornecedor não informado"} · {dataBR(h.ultimo.data)}
                    </p>
                    {h.anterior && (
                      <p className="mt-0.5 text-[.8rem] text-[var(--text-muted)]">
                        Antes: {brl(h.anterior.preco)} em {dataBR(h.anterior.data)}{h.anterior.fornecedor ? ` (${h.anterior.fornecedor})` : ""}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <div className="hidden sm:block">
                <Tabela>
                  <thead>
                    <tr>
                      <th className={th}>Insumo</th>
                      <th className={`${th} text-right`}>Último preço</th>
                      <th className={`${th} text-right`}>Anterior</th>
                      <th className={th}>Variação</th>
                      <th className={th}>Fornecedor</th>
                      <th className={th}>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((h) => (
                      <tr key={h.chave}>
                        <td className={`${td} max-w-[240px]`}>
                          <span className="block truncate font-semibold" title={h.descricao}>{h.descricao}</span>
                          <span className="text-[.78rem] text-[var(--text-muted)]">
                            {h.compras} {h.compras === 1 ? "compra" : "compras"}
                            {h.compras > 1 && h.ultimo.preco > h.menorPreco ? ` · menor já pago ${brl(h.menorPreco)}` : ""}
                          </span>
                        </td>
                        <td className={`${td} whitespace-nowrap text-right font-semibold tabular-nums`}>{preco(h.ultimo.preco, h.unidade)}</td>
                        <td className={`${td} whitespace-nowrap text-right tabular-nums text-[var(--text-secondary)]`}>{h.anterior ? brl(h.anterior.preco) : "—"}</td>
                        <td className={`${td} whitespace-nowrap`}><Variacao h={h} /></td>
                        <td className={`${td} max-w-[200px]`}>
                          <span className="block truncate" title={h.ultimo.fornecedor ?? ""}>{h.ultimo.fornecedor ?? "—"}</span>
                        </td>
                        <td className={`${td} whitespace-nowrap tabular-nums`}>{dataBR(h.ultimo.data)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Tabela>
              </div>
              <p className="mt-3 text-[.75rem] text-[var(--text-muted)]">
                Compara o preço unitário das notas de compra do mesmo produto e unidade. Nomes escritos de forma diferente na nota podem aparecer separados.
              </p>
            </>
          )}
        </Cartao>
      </div>
    </>
  );
}
