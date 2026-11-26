import Link from "next/link";
import { contextoGestao, tabelaAusente, type GestaoContexto } from "@/lib/gestao/contexto";
import { brl, dataBR } from "@/lib/gestao/format";
import { notaEhCompra } from "@/lib/gestao/estoque-entrada";
import { historicoDePrecos, type CompraItem, type HistoricoPreco } from "@/lib/gestao/insumos";
import { Cartao, Kpi, Tabela, Titulo, Vazio, td, th } from "../../ui";
import { AbasEstoque, Aviso } from "../ui-estoque";

export const metadata = { title: "Preços pagos" };
export const dynamic = "force-dynamic";

type Db = GestaoContexto["supabase"];
type Registro = Record<string, string | number | null | undefined>;

const lista = <T,>(v: T | T[] | null | undefined): T[] => (Array.isArray(v) ? v : v ? [v] : []);
const numero = (v: unknown): number | null => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const pct = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const preco = (v: number, un: string | null) => `${brl(v)}${un ? ` / ${un}` : ""}`;

/**
 * Compras nas duas tabelas fiscais, sem contar a mesma nota duas vezes.
 * "Compra" pelo ponto de vista do cliente (notaEhCompra): a versão anterior
 * filtrava fiscal_invoices.direction = 'entrada', que vem do CFOP de quem
 * emitiu — e a compra do produtor chega como "saida" do fornecedor, ficando
 * de fora do histórico.
 */
async function carregarCompras(supabase: Db, clientId: string): Promise<{ compras: CompraItem[]; falhou: boolean }> {
  const [canon, leg, tit] = await Promise.all([
    supabase
      .from("fiscal_invoices")
      .select("id, number, issuer_cnpj, issuer_name, recipient_cnpj, issued_at, status, fiscal_invoice_items(description, unit, unit_price, cfop)")
      .eq("client_id", clientId)
      .order("issued_at", { ascending: false, nullsFirst: false })
      .limit(600),
    supabase
      .from("fiscal_notes")
      .select("id, numero_nota, emitente_cnpj, emitente_nome, data_emissao, fiscal_note_items(descricao, unidade, valor_unitario, cfop)")
      .eq("client_id", clientId)
      .order("data_emissao", { ascending: false, nullsFirst: false })
      .limit(600),
    supabase.from("titulos_financeiros").select("fiscal_invoice_id, fiscal_note_id, tipo").eq("client_id", clientId).neq("status", "cancelado").limit(5000),
  ]);

  const falhou = [canon.error, leg.error, tit.error].some((e) => !!e && !tabelaAusente(e));
  if (falhou) console.error("[gestao/estoque/precos] compras:", canon.error?.message, leg.error?.message, tit.error?.message);

  const tipos = new Map<string, string[]>();
  for (const t of (tit.error ? [] : (tit.data ?? [])) as Registro[]) {
    for (const id of [t.fiscal_invoice_id, t.fiscal_note_id]) if (typeof id === "string") tipos.set(id, [...(tipos.get(id) ?? []), String(t.tipo)]);
  }

  const compras: CompraItem[] = [];
  const notasCanonicas = new Set<string>();
  for (const n of (canon.error ? [] : (canon.data ?? [])) as unknown as Array<Registro & { fiscal_invoice_items: Registro[] | Registro | null }>) {
    const notaId = String(n.id);
    notasCanonicas.add(notaId);
    if (n.status === "rejected" || n.status === "archived") continue;
    const itens = lista(n.fiscal_invoice_items);
    const compra = notaEhCompra({
      numero: (n.number as string | null) ?? null, tiposTitulos: tipos.get(notaId) ?? [], cfops: itens.map((i) => (i.cfop as string | null) ?? null),
      emitenteDoc: (n.issuer_cnpj as string | null) ?? null, destinatarioDoc: (n.recipient_cnpj as string | null) ?? null,
    });
    if (!compra) continue;
    for (const i of itens) {
      const p = numero(i.unit_price);
      if (p === null || !i.description) continue;
      compras.push({
        descricao: String(i.description), unidade: (i.unit as string | null) ?? null, preco: p,
        data: n.issued_at ? String(n.issued_at).slice(0, 10) : null, fornecedor: (n.issuer_name as string | null) ?? null, notaId,
      });
    }
  }
  for (const n of (leg.error ? [] : (leg.data ?? [])) as unknown as Array<Registro & { fiscal_note_items: Registro[] | Registro | null }>) {
    const notaId = String(n.id);
    if (notasCanonicas.has(notaId)) continue;
    const itens = lista(n.fiscal_note_items);
    const compra = notaEhCompra({
      numero: (n.numero_nota as string | null) ?? null, tiposTitulos: tipos.get(notaId) ?? [], cfops: itens.map((i) => (i.cfop as string | null) ?? null),
      emitenteDoc: (n.emitente_cnpj as string | null) ?? null,
    });
    if (!compra) continue;
    for (const i of itens) {
      const p = numero(i.valor_unitario);
      if (p === null || !i.descricao) continue;
      compras.push({
        descricao: String(i.descricao), unidade: (i.unidade as string | null) ?? null, preco: p,
        data: n.data_emissao ? String(n.data_emissao).slice(0, 10) : null, fornecedor: (n.emitente_nome as string | null) ?? null, notaId,
      });
    }
  }
  return { compras, falhou };
}

function Variacao({ h }: { h: HistoricoPreco }) {
  if (h.variacao === null || !h.sentido) return <span className="text-[var(--text-muted)]">Primeira compra</span>;
  if (h.sentido === "estavel") return <span className="text-[var(--text-secondary)]">Estável ({pct(h.variacao)})</span>;
  const alta = h.sentido === "alta";
  return (
    <span className={`font-semibold tabular-nums ${alta ? "text-[var(--danger)]" : "text-[var(--primary)]"}`} aria-label={`${alta ? "Subiu" : "Caiu"} ${pct(Math.abs(h.variacao))}`}>
      <span aria-hidden="true">{alta ? "▲ +" : "▼ "}</span>{pct(h.variacao).replace("-", "")}
    </span>
  );
}

export default async function PrecosPage() {
  const { supabase, clientId } = await contextoGestao();
  const { compras, falhou } = await carregarCompras(supabase, clientId);
  const historico = historicoDePrecos(compras);
  const subiram = historico.filter((h) => h.sentido === "alta");
  const maiorAlta = subiram[0];

  return (
    <>
      <Titulo titulo="Preços pagos" subtitulo="Quanto você pagou em cada compra do mesmo produto. A alta na revenda não passa batida." />
      <AbasEstoque ativo="precos" />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4">
        <Kpi rotulo="Produtos comparados" valor={String(historico.length)} />
        <Kpi
          rotulo="Subiram na última compra"
          valor={String(subiram.length)}
          tom={subiram.length > 0 ? "perigo" : "neutro"}
          detalhe={maiorAlta?.variacao != null ? `Maior alta: ${maiorAlta.descricao} (+${pct(maiorAlta.variacao)})` : "Nenhuma alta em vista"}
        />
      </div>
      {falhou && <Aviso tom="alerta" className="mb-4">Parte dos dados não pôde ser lida agora. Os números abaixo podem estar incompletos.</Aviso>}

      <Cartao titulo="Quanto você pagou em cada compra">
        {historico.length === 0 ? (
          <Vazio
            titulo="Sem compras para comparar"
            texto="Com duas notas do mesmo produto, mostramos se o preço subiu e de quanto."
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
                  <p className="mt-0.5 text-[.8rem] text-[var(--text-muted)]">{h.ultimo.fornecedor ?? "Fornecedor não informado"} · {dataBR(h.ultimo.data)}</p>
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
                      <td className={`${td} max-w-[200px]`}><span className="block truncate" title={h.ultimo.fornecedor ?? ""}>{h.ultimo.fornecedor ?? "—"}</span></td>
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
    </>
  );
}
