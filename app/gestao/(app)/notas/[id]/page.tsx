import Link from "next/link";
import { notFound } from "next/navigation";
import { contextoGestao, tabelaAusente } from "@/lib/gestao/contexto";
import { brl, dataBR, num } from "@/lib/gestao/format";
import { BotaoLink, Cartao, Selo, Tabela, Titulo, Vazio, td, th } from "../../ui";
import { UUID, statusDaNota, type TomSelo } from "../dados";

export const metadata = { title: "Nota fiscal" };

export const dynamic = "force-dynamic";

type Item = {
  descricao: string | null; ncm: string | null; cfop: string | null; quantidade: number | null;
  unidade: string | null; unitario: number | null; total: number | null;
};
type Titulo_ = {
  id: string; tipo: string; numero_parcela: string | null; valor: number | string; vencimento: string;
  status: string; contraparte_nome: string | null;
};
type Nota = {
  id: string; origem: "canonica" | "legado"; numero: string | null; serie: string | null; chave: string | null;
  emitente: string | null; emitenteCnpj: string | null; destinatario: string | null; data: string | null;
  valor: number | null; status: string | null; direcao: string | null; fonte: string | null; observacao: string | null;
  impostos: Array<{ rotulo: string; valor: number }>;
};

const n = (v: unknown) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const FONTE: Record<string, string> = {
  xml_upload: "XML enviado", pdf_upload: "PDF enviado", audio_dictation: "Ditado", csv_import: "Planilha",
  sefaz_api: "Sincronizada com a SEFAZ", manual: "Lançamento manual",
};
const STATUS_TITULO: Record<string, { rotulo: string; tom: TomSelo }> = {
  aberto: { rotulo: "Em aberto", tom: "alerta" },
  pago: { rotulo: "Pago", tom: "verde" },
  cancelado: { rotulo: "Cancelado", tom: "neutro" },
};

function Dado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[.72rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">{rotulo}</dt>
      <dd className="mt-0.5 break-words text-[.9rem] text-[var(--text-primary)]">{children}</dd>
    </div>
  );
}

export default async function NotaDetalhe({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ origem?: string }>;
}) {
  const { id } = await params;
  const { origem } = await searchParams;
  if (!UUID.test(id)) notFound();
  const { supabase, clientId } = await contextoGestao();

  async function buscarCanonica(): Promise<{ nota: Nota; itens: Item[] } | null> {
    const { data, error } = await supabase
      .from("fiscal_invoices")
      .select("id, number, series, access_key, issuer_name, issuer_cnpj, recipient_name, issued_at, gross_value, direction, status, source, review_notes, icms_value, ipi_value, pis_value, cofins_value, funrural_value")
      .eq("id", id).eq("client_id", clientId).maybeSingle();
    if (error || !data) return null;
    const r = data as unknown as Record<string, string | number | null>;
    const { data: its } = await supabase
      .from("fiscal_invoice_items")
      .select("description, ncm, cfop, quantity, unit, unit_price, total_price")
      .eq("fiscal_invoice_id", id).order("sequence", { ascending: true });
    const itens = ((its ?? []) as unknown as Array<Record<string, string | number | null>>).map<Item>((i) => ({
      descricao: i.description as string | null, ncm: i.ncm as string | null, cfop: i.cfop as string | null,
      quantidade: n(i.quantity), unidade: i.unit as string | null, unitario: n(i.unit_price), total: n(i.total_price),
    }));
    const impostos = [
      { rotulo: "ICMS", valor: n(r.icms_value) }, { rotulo: "IPI", valor: n(r.ipi_value) },
      { rotulo: "PIS", valor: n(r.pis_value) }, { rotulo: "COFINS", valor: n(r.cofins_value) },
      { rotulo: "FUNRURAL", valor: n(r.funrural_value) },
    ].filter((x): x is { rotulo: string; valor: number } => x.valor !== null && x.valor > 0);
    return {
      itens,
      nota: {
        id, origem: "canonica", numero: r.number as string | null, serie: r.series as string | null,
        chave: r.access_key as string | null, emitente: r.issuer_name as string | null,
        emitenteCnpj: r.issuer_cnpj as string | null, destinatario: r.recipient_name as string | null,
        data: r.issued_at ? String(r.issued_at).slice(0, 10) : null, valor: n(r.gross_value),
        status: r.status as string | null, direcao: r.direction as string | null, fonte: r.source as string | null,
        observacao: r.review_notes as string | null, impostos,
      },
    };
  }

  async function buscarLegado(): Promise<{ nota: Nota; itens: Item[] } | null> {
    const { data, error } = await supabase
      .from("fiscal_notes")
      .select("id, numero_nota, serie, emitente_nome, emitente_cnpj, data_emissao, valor_total, status, created_at")
      .eq("id", id).eq("client_id", clientId).maybeSingle();
    if (error || !data) return null;
    const r = data as unknown as Record<string, string | number | null>;
    const { data: its } = await supabase
      .from("fiscal_note_items")
      .select("descricao, ncm, cfop, quantidade, unidade, valor_unitario, valor_total, icms_valor, ipi_valor")
      .eq("note_id", id).order("descricao");
    const linhas = (its ?? []) as unknown as Array<Record<string, string | number | null>>;
    const itens = linhas.map<Item>((i) => ({
      descricao: i.descricao as string | null, ncm: i.ncm as string | null, cfop: i.cfop as string | null,
      quantidade: n(i.quantidade), unidade: i.unidade as string | null, unitario: n(i.valor_unitario), total: n(i.valor_total),
    }));
    const soma = (campo: string) => linhas.reduce((s, i) => s + (n(i[campo]) ?? 0), 0);
    const impostos = [{ rotulo: "ICMS", valor: soma("icms_valor") }, { rotulo: "IPI", valor: soma("ipi_valor") }].filter((x) => x.valor > 0);
    const primeiro = itens.find((i) => i.cfop)?.cfop?.trim().charAt(0);
    return {
      itens,
      nota: {
        id, origem: "legado", numero: r.numero_nota as string | null, serie: r.serie as string | null, chave: null,
        emitente: r.emitente_nome as string | null, emitenteCnpj: r.emitente_cnpj as string | null, destinatario: null,
        data: (r.data_emissao ?? r.created_at) ? String(r.data_emissao ?? r.created_at).slice(0, 10) : null,
        valor: n(r.valor_total), status: r.status as string | null,
        direcao: primeiro && "123".includes(primeiro) ? "entrada" : primeiro && "567".includes(primeiro) ? "saida" : null,
        fonte: null, observacao: null, impostos,
      },
    };
  }

  // ?origem= define quem tenta primeiro; sem ele (ou se não achar), tenta a outra.
  const ordem = origem === "legado" ? [buscarLegado, buscarCanonica] : [buscarCanonica, buscarLegado];
  let achou: { nota: Nota; itens: Item[] } | null = null;
  for (const buscar of ordem) {
    achou = await buscar();
    if (achou) break;
  }
  if (!achou) notFound();
  const { nota, itens } = achou;
  const status = statusDaNota(nota.origem, nota.status);

  // Títulos gerados (id compartilhado entre as duas tabelas no modo dual).
  const { data: tit, error: titErro } = await supabase
    .from("titulos_financeiros")
    .select("id, tipo, numero_parcela, valor, vencimento, status, contraparte_nome")
    .eq("client_id", clientId)
    .or(`fiscal_invoice_id.eq.${id},fiscal_note_id.eq.${id}`)
    .order("vencimento", { ascending: true });
  const titulosAusentes = tabelaAusente(titErro);
  const titulos = titErro ? [] : ((tit ?? []) as unknown as Titulo_[]);
  if (titErro && !titulosAusentes) console.error("[gestao/notas/id] titulos:", titErro.message);
  const totalTitulos = titulos.filter((t) => t.status !== "cancelado").reduce((s, t) => s + Number(t.valor), 0);

  return (
    <>
      <p className="mb-3 text-[.85rem]">
        <Link href="/gestao/notas" className="font-semibold text-[var(--primary-hover)] underline-offset-2 hover:underline">
          ← Notas fiscais
        </Link>
      </p>
      <Titulo
        titulo={nota.numero ? `NF-e ${nota.numero}` : "NF-e sem número"}
        subtitulo={[nota.emitente, nota.data ? dataBR(nota.data) : null].filter(Boolean).join(" · ") || undefined}
        acao={<BotaoLink href="/gestao/financeiro">Ver no financeiro</BotaoLink>}
      />

      {nota.status === "rejected" && nota.observacao && (
        <p role="status" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[.85rem] text-red-800">
          Nota rejeitada: {nota.observacao}
        </p>
      )}

      <div className="space-y-5">
        <Cartao titulo="Dados da nota" acao={<Selo tom={status.tom}>{status.rotulo}</Selo>}>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <Dado rotulo="Emitente">{nota.emitente ?? "—"}</Dado>
            <Dado rotulo="CNPJ do emitente">{nota.emitenteCnpj ?? "—"}</Dado>
            <Dado rotulo="Valor da nota"><span className="font-semibold tabular-nums">{nota.valor === null ? "—" : brl(nota.valor)}</span></Dado>
            <Dado rotulo="Emissão">{dataBR(nota.data)}</Dado>
            <Dado rotulo="Tipo">{nota.direcao === "entrada" ? "Compra (entrada)" : nota.direcao === "saida" ? "Venda (saída)" : "—"}</Dado>
            <Dado rotulo="Origem">{nota.fonte ? (FONTE[nota.fonte] ?? nota.fonte) : "Importada"}</Dado>
            {nota.destinatario && <Dado rotulo="Destinatário">{nota.destinatario}</Dado>}
            {nota.chave && (
              <div className="min-w-0 sm:col-span-2">
                <Dado rotulo="Chave de acesso"><span className="break-all text-[.82rem] tabular-nums text-[var(--text-secondary)]">{nota.chave}</span></Dado>
              </div>
            )}
          </dl>
        </Cartao>

        <Cartao titulo={`Itens (${itens.length})`}>
          {itens.length === 0 ? (
            <Vazio titulo="Sem itens registrados" texto="Esta nota não trouxe itens. Se veio de PDF, envie o XML para um retrato completo." />
          ) : (
            <>
              <ul className="divide-y divide-[var(--border)] sm:hidden">
                {itens.map((i, k) => (
                  <li key={k} className="py-3 first:pt-0 last:pb-0">
                    <p className="font-semibold text-[var(--text-primary)]">{i.descricao ?? "Item sem descrição"}</p>
                    <p className="mt-0.5 text-[.8rem] text-[var(--text-muted)]">
                      {i.quantidade === null ? "—" : num(i.quantidade, 2)} {i.unidade ?? ""} × {i.unitario === null ? "—" : brl(i.unitario)}
                    </p>
                    <p className="mt-0.5 font-semibold tabular-nums">{i.total === null ? "—" : brl(i.total)}</p>
                  </li>
                ))}
              </ul>
              <div className="hidden sm:block">
                <Tabela>
                  <thead>
                    <tr>
                      <th className={th}>Item</th>
                      <th className={th}>NCM</th>
                      <th className={`${th} text-right`}>Qtd.</th>
                      <th className={`${th} text-right`}>Unitário</th>
                      <th className={`${th} text-right`}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((i, k) => (
                      <tr key={k}>
                        <td className={`${td} max-w-[280px]`}><span className="block truncate" title={i.descricao ?? ""}>{i.descricao ?? "—"}</span></td>
                        <td className={`${td} whitespace-nowrap tabular-nums text-[var(--text-secondary)]`}>{i.ncm ?? "—"}</td>
                        <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{i.quantidade === null ? "—" : `${num(i.quantidade, 2)} ${i.unidade ?? ""}`}</td>
                        <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{i.unitario === null ? "—" : brl(i.unitario)}</td>
                        <td className={`${td} whitespace-nowrap text-right font-semibold tabular-nums`}>{i.total === null ? "—" : brl(i.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Tabela>
              </div>
            </>
          )}
        </Cartao>

        <Cartao titulo="Impostos">
          {nota.impostos.length === 0 ? (
            <p className="text-[.88rem] text-[var(--text-muted)]">Nenhum imposto destacado nesta nota.</p>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {nota.impostos.map((x) => (
                <Dado key={x.rotulo} rotulo={x.rotulo}><span className="font-semibold tabular-nums">{brl(x.valor)}</span></Dado>
              ))}
            </dl>
          )}
        </Cartao>

        <Cartao titulo="Títulos gerados" acao={titulos.length > 0 ? <span className="text-[.82rem] tabular-nums text-[var(--text-muted)]">Total {brl(totalTitulos)}</span> : undefined}>
          {titulosAusentes ? (
            <p className="text-[.88rem] text-[var(--text-muted)]">O contas a pagar está sendo ligado à sua conta. Os títulos desta nota aparecem aqui em seguida.</p>
          ) : titulos.length === 0 ? (
            <Vazio
              titulo="Esta nota ainda não gerou títulos"
              texto="Quando a nota traz parcelas, cada uma vira um título a pagar com vencimento."
              acao={<BotaoLink href="/gestao/financeiro">Abrir o financeiro</BotaoLink>}
            />
          ) : (
            <>
              <ul className="divide-y divide-[var(--border)] sm:hidden">
                {titulos.map((t) => {
                  const s = STATUS_TITULO[t.status] ?? { rotulo: t.status, tom: "neutro" as TomSelo };
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="font-semibold tabular-nums">{brl(t.valor)}</p>
                        <p className="text-[.8rem] text-[var(--text-muted)]">
                          {t.tipo === "receber" ? "A receber" : "A pagar"} · vence {dataBR(t.vencimento)}{t.numero_parcela ? ` · parcela ${t.numero_parcela}` : ""}
                        </p>
                      </div>
                      <Selo tom={s.tom}>{s.rotulo}</Selo>
                    </li>
                  );
                })}
              </ul>
              <div className="hidden sm:block">
                <Tabela>
                  <thead>
                    <tr>
                      <th className={th}>Parcela</th>
                      <th className={th}>Tipo</th>
                      <th className={th}>Vencimento</th>
                      <th className={`${th} text-right`}>Valor</th>
                      <th className={th}>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {titulos.map((t) => {
                      const s = STATUS_TITULO[t.status] ?? { rotulo: t.status, tom: "neutro" as TomSelo };
                      return (
                        <tr key={t.id}>
                          <td className={td}>{t.numero_parcela ?? "—"}</td>
                          <td className={td}>{t.tipo === "receber" ? "A receber" : "A pagar"}</td>
                          <td className={`${td} tabular-nums`}>{dataBR(t.vencimento)}</td>
                          <td className={`${td} text-right tabular-nums`}>{brl(t.valor)}</td>
                          <td className={td}><Selo tom={s.tom}>{s.rotulo}</Selo></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Tabela>
              </div>
            </>
          )}
        </Cartao>
      </div>
    </>
  );
}
