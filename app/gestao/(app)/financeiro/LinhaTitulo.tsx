import Link from "next/link";
import { brl, dataBR, diasEntre } from "@/lib/gestao/format";
import { Selo, btnPrimario, btnSecundario, campo, rotuloCampo } from "../ui";
import { darBaixa, desfazerBaixa } from "./actions";

export type Titulo = {
  id: string;
  tipo: "pagar" | "receber";
  descricao: string;
  contraparte_nome: string | null;
  numero_parcela: string | null;
  valor: number | string;
  vencimento: string;
  status: string;
  data_baixa: string | null;
  valor_baixa: number | string | null;
  forma_pagamento: string | null;
  origem: string;
  centro: string | null;
};

const FORMAS = ["Pix", "Boleto", "Transferência", "Dinheiro", "Cartão"];

function prazo(venc: string, hoje: string): { texto: string; vencido: boolean } {
  const d = diasEntre(hoje, venc);
  if (d === 0) return { texto: "vence hoje", vencido: false };
  if (d > 0) return { texto: `vence em ${d} ${d === 1 ? "dia" : "dias"}`, vencido: false };
  const a = Math.abs(d);
  return { texto: `venceu há ${a} ${a === 1 ? "dia" : "dias"}`, vencido: true };
}

export function LinhaTitulo({ t, hoje, voltar }: { t: Titulo; hoje: string; voltar: string }) {
  const pago = t.status === "pago";
  const p = prazo(t.vencimento, hoje);
  const rotuloContraparte = t.contraparte_nome || (t.tipo === "pagar" ? "Fornecedor não informado" : "Cliente não informado");
  const verbo = t.tipo === "pagar" ? "pagamento" : "recebimento";

  return (
    <li className="py-3.5 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="truncate text-[.92rem] font-semibold text-[var(--text-primary)]" title={rotuloContraparte}>
            {rotuloContraparte}
          </p>
          <p className="mt-0.5 text-[.84rem] text-[var(--text-secondary)] [overflow-wrap:anywhere]">
            {t.descricao}
            {t.numero_parcela && !/parcela/i.test(t.descricao ?? "") && <span className="text-[var(--text-muted)]"> · parcela {t.numero_parcela}</span>}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[.78rem] text-[var(--text-muted)]">
            {pago ? (
              <span>Baixa em {dataBR(t.data_baixa)}{t.forma_pagamento ? ` · ${t.forma_pagamento}` : ""} · venc. {dataBR(t.vencimento)}</span>
            ) : (
              <span>
                {dataBR(t.vencimento)} ·{" "}
                <span className={p.vencido ? "font-semibold text-[var(--danger)]" : ""}>{p.texto}</span>
              </span>
            )}
            {t.centro && <span>· {t.centro}</span>}
            {t.origem === "nfe" && (
              <Link href="/gestao/notas" aria-label="Origem: NF-e. Abrir notas fiscais" className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]">
                <Selo tom="verde">NF-e</Selo>
              </Link>
            )}
          </p>
        </div>
        <p className="shrink-0 text-[1rem] font-semibold tabular-nums text-[var(--text-primary)] sm:text-right">
          {brl(pago ? (t.valor_baixa ?? t.valor) : t.valor)}
        </p>
      </div>

      <details className="group mt-2.5">
        <summary className={`${btnSecundario} w-full cursor-pointer list-none px-3 py-2 text-[.8rem] sm:w-auto [&::-webkit-details-marker]:hidden`}>
          {pago ? "Desfazer baixa" : t.tipo === "pagar" ? "Dar baixa (paguei)" : "Dar baixa (recebi)"}
        </summary>

        {pago ? (
          <form action={desfazerBaixa} className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3.5">
            <input type="hidden" name="id" value={t.id} />
            <input type="hidden" name="voltar" value={voltar} />
            <p className="text-[.85rem] text-[var(--text-secondary)]">
              O título volta para &ldquo;em aberto&rdquo; e o {verbo} registrado em {dataBR(t.data_baixa)} é apagado.
            </p>
            <button type="submit" className={`${btnPrimario} mt-3 w-full sm:w-auto`}>Confirmar: voltar para em aberto</button>
          </form>
        ) : (
          <form action={darBaixa} className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3.5">
            <input type="hidden" name="id" value={t.id} />
            <input type="hidden" name="voltar" value={voltar} />
            <p className="mb-3 text-[.85rem] text-[var(--text-secondary)]">
              Confirme os dados do {verbo}. Você pode desfazer depois.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor={`d-${t.id}`} className={rotuloCampo}>Data</label>
                <input id={`d-${t.id}`} name="data_baixa" type="date" required max={hoje} defaultValue={hoje} className={campo} />
              </div>
              <div>
                <label htmlFor={`v-${t.id}`} className={rotuloCampo}>Valor (R$)</label>
                <input
                  id={`v-${t.id}`} name="valor_baixa" required inputMode="decimal" autoComplete="off"
                  defaultValue={Number(t.valor).toFixed(2).replace(".", ",")} className={campo}
                />
              </div>
              <div>
                <label htmlFor={`f-${t.id}`} className={rotuloCampo}>Forma</label>
                <select id={`f-${t.id}`} name="forma_pagamento" required defaultValue="Pix" className={campo}>
                  {FORMAS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" className={`${btnPrimario} mt-3 w-full sm:w-auto`}>
              {t.tipo === "pagar" ? "Confirmar pagamento" : "Confirmar recebimento"}
            </button>
          </form>
        )}
      </details>
    </li>
  );
}
