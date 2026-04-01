"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import DocumentGate, {
  type GateMode,
  type ParsedDoc,
  LockedField,
  UnverifiedBadge,
} from "@/app/components/DocumentGate";

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type Product = { id: string; name: string };

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10";
const labelCls =
  "mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]";

export default function NovoLote() {
  const router = useRouter();

  const [products,  setProducts]  = useState<Product[]>([]);
  const [gateMode,  setGateMode]  = useState<GateMode>("idle");
  const [parsedDoc, setParsedDoc] = useState<ParsedDoc | null>(null);

  // Campos do formulário
  const [productId,      setProductId]      = useState("");
  const [batchNumber,    setBatchNumber]    = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [quantity,       setQuantity]       = useState("");
  const [selectedItem,   setSelectedItem]   = useState<number>(-1); // índice no parsedDoc.items

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  useEffect(() => {
    supabase.from("products").select("id,name").order("name").then(({ data }) => {
      setProducts(data ?? []);
    });
  }, []);

  // Quando um item da nota é selecionado, pre-preenche quantidade
  function handleSelectItem(idx: number) {
    setSelectedItem(idx);
    if (idx >= 0 && parsedDoc) {
      const item = parsedDoc.items[idx];
      setQuantity(String(item.quantidade));
    } else {
      setQuantity("");
    }
  }

  function handleParsed(data: ParsedDoc) {
    setParsedDoc(data);
    setGateMode("verified");
    setSelectedItem(-1);
    setQuantity("");
  }

  function handleManual() {
    setParsedDoc(null);
    setGateMode("manual");
    setQuantity("");
    setSelectedItem(-1);
  }

  function handleReset() {
    setParsedDoc(null);
    setGateMode("idle");
    setQuantity("");
    setSelectedItem(-1);
    setBatchNumber("");
    setExpirationDate("");
    setProductId("");
  }

  function verifiedSummary() {
    if (!parsedDoc) return "";
    const h = parsedDoc.header;
    const parts = [
      h.numero_nota && `NF-e ${h.numero_nota}`,
      h.emitente_nome,
      h.valor_total > 0 && `R$\u00a0${h.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    ].filter(Boolean);
    return parts.join(" · ");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId || !batchNumber || !expirationDate || !quantity) {
      setError("Preencha todos os campos obrigatórios");
      return;
    }
    setSubmitting(true);
    setError("");

    // Monta document_source
    let documentSource: string | null = null;
    if (gateMode === "verified" && parsedDoc) {
      const item = selectedItem >= 0 ? parsedDoc.items[selectedItem] : null;
      documentSource = item
        ? `nfe:${parsedDoc.header.numero_nota}:${item.descricao.slice(0, 40)}`
        : `nfe:${parsedDoc.header.numero_nota}`;
    }

    const { error: err } = await supabase.from("stock_batches").insert({
      product_id:      productId,
      batch_number:    batchNumber,
      expiration_date: expirationDate,
      quantity:        Number(quantity),
      document_source: documentSource,
    });

    if (err) {
      setError("Erro ao salvar lote: " + err.message);
      setSubmitting(false);
      return;
    }
    router.push("/estoque");
  }

  return (
    <main className="space-y-8">
      {/* ── Hero ── */}
      <section className="ag-card-strong p-8">
        <span className="ag-badge ag-badge-green">Estoque</span>
        <h1 className="ag-page-title mt-2">Novo Lote Sanitário</h1>
        <p className="mt-1 text-[var(--text-secondary)]">
          Importe a nota fiscal de entrada para garantir rastreabilidade completa.
        </p>
      </section>

      {/* ── Formulário com DocumentGate ── */}
      <section className="ag-card-strong p-8">
        <DocumentGate
          mode={gateMode}
          verifiedSummary={verifiedSummary()}
          onParsed={handleParsed}
          onManual={handleManual}
          onReset={handleReset}
        >
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Seletor de item da nota (só quando verified e tem itens) */}
            {gateMode === "verified" && parsedDoc && parsedDoc.items.length > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Itens da nota — selecione o produto a adicionar ao estoque
                </p>
                <div className="space-y-1.5">
                  {parsedDoc.items.map((item, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center gap-3 cursor-pointer rounded-xl border px-4 py-2.5 text-sm transition ${
                        selectedItem === idx
                          ? "border-emerald-400 bg-white"
                          : "border-emerald-200 bg-white/50 hover:bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="nota_item"
                        checked={selectedItem === idx}
                        onChange={() => handleSelectItem(idx)}
                        className="accent-emerald-600"
                      />
                      <span className="flex-1 font-medium text-[var(--text-primary)]">{item.descricao}</span>
                      <span className="text-[var(--text-muted)]">
                        {item.quantidade.toLocaleString("pt-BR")} {item.unidade}
                      </span>
                      <span className="text-emerald-700 font-semibold">
                        R$&nbsp;{item.valor_unitario.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}/un
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Produto */}
              <div>
                <label className={labelCls}>
                  Produto *
                  {gateMode === "manual" && <span className="ml-2 align-middle"><UnverifiedBadge /></span>}
                </label>
                <select
                  value={productId}
                  onChange={e => setProductId(e.target.value)}
                  className={inputCls}
                  required
                >
                  <option value="">Selecione o produto</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {gateMode === "verified" && selectedItem >= 0 && parsedDoc && (
                  <p className="mt-1 text-xs text-emerald-600">
                    Dica da nota: &ldquo;{parsedDoc.items[selectedItem].descricao}&rdquo;
                  </p>
                )}
              </div>

              {/* Quantidade — bloqueada se veio do documento */}
              {gateMode === "verified" && selectedItem >= 0 ? (
                <LockedField
                  label={`Quantidade (${parsedDoc?.items[selectedItem]?.unidade ?? "un"})`}
                  value={`${Number(quantity).toLocaleString("pt-BR")} ${parsedDoc?.items[selectedItem]?.unidade ?? ""}`}
                />
              ) : (
                <div>
                  <label className={labelCls}>
                    Quantidade *
                    {gateMode === "manual" && <span className="ml-2 align-middle"><UnverifiedBadge /></span>}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    placeholder="Ex: 10"
                    className={inputCls}
                    required
                  />
                </div>
              )}

              {/* Número do lote */}
              <div>
                <label className={labelCls}>Número do lote *</label>
                <input
                  type="text"
                  value={batchNumber}
                  onChange={e => setBatchNumber(e.target.value)}
                  placeholder="Ex: LOT-2024-001"
                  className={inputCls}
                  required
                />
              </div>

              {/* Validade */}
              <div>
                <label className={labelCls}>Data de validade *</label>
                <input
                  type="date"
                  value={expirationDate}
                  onChange={e => setExpirationDate(e.target.value)}
                  className={inputCls}
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="ag-button-primary flex items-center gap-2 disabled:opacity-60"
              >
                {submitting
                  ? <><Loader2 size={14} className="animate-spin" />Salvando…</>
                  : <><CheckCircle size={14} />Salvar lote</>
                }
              </button>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          </form>
        </DocumentGate>
      </section>
    </main>
  );
}
