"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2, Tag, Wheat, ShoppingBag, Truck, Package, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TYPES: { key: string; label: string; Icon: LucideIcon; hint: string }[] = [
  { key: "animal",      label: "Animal",      Icon: Tag,          hint: "Bovinos, ovinos, aves"  },
  { key: "safra",       label: "Safra",       Icon: Wheat,        hint: "Soja, milho, café, cana" },
  { key: "insumo",      label: "Insumo",      Icon: ShoppingBag,  hint: "Ração, medicamentos"    },
  { key: "maquinario",  label: "Maquinário",  Icon: Truck,        hint: "Tratores, colheitadeiras" },
  { key: "equipamento", label: "Equipamento", Icon: Truck,        hint: "Balança, cocho, silos"  },
  { key: "epi",         label: "EPI",         Icon: ShoppingBag,  hint: "Luvas, botinas, capa"   },
  { key: "outro",       label: "Outro",       Icon: Package,      hint: "Qualquer outra coisa"   },
];

const UNITS: Record<string, string[]> = {
  animal:      ["cabeça", "arroba", "kg"],
  safra:       ["tonelada", "saca", "kg"],
  insumo:      ["kg", "L", "unidade", "caixa"],
  maquinario:  ["unidade"],
  equipamento: ["unidade"],
  epi:         ["unidade", "caixa", "par"],
  outro:       ["unidade", "kg", "L"],
};

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export default function NewListingForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [listingType, setListingType] = useState<string>("");
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory]       = useState("");
  const [price, setPrice]             = useState<number>(0);
  const [unit, setUnit]               = useState<string>("");
  const [qty, setQty]                 = useState<number>(1);
  const [city, setCity]               = useState("");
  const [uf, setUf]                   = useState("");
  const [halal, setHalal]             = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const units = useMemo(() => UNITS[listingType] ?? ["unidade"], [listingType]);

  const canAdvance1 = listingType !== "";
  const canAdvance2 =
    title.trim().length >= 5 &&
    price > 0 &&
    unit !== "" &&
    qty > 0;
  const canSubmit = city.trim().length > 0 && uf !== "";

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/marketplace/listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_type: listingType,
          title: title.trim(),
          description: description.trim() || null,
          category: category.trim() || null,
          price_per_unit: price,
          unit,
          quantity_available: qty,
          location_city: city.trim(),
          location_state: uf,
          halal_certified: halal,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao publicar anúncio.");
      router.push(`/marketplace/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao publicar anúncio.");
      setLoading(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15";

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white p-8 shadow-[var(--shadow-soft)]">
      {/* Stepper */}
      <div className="mb-8 flex items-center gap-2">
        {[1, 2, 3].map((n) => {
          const active = step >= n;
          const done = step > n;
          return (
            <div key={n} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[.75rem] font-bold transition ${
                  done
                    ? "bg-[var(--primary)] text-white"
                    : active
                    ? "bg-[var(--primary)] text-white ring-4 ring-[var(--primary-soft)]"
                    : "bg-[var(--surface-soft)] text-[var(--text-muted)]"
                }`}
              >
                {done ? <CheckCircle2 size={14} /> : n}
              </div>
              {n < 3 && (
                <div
                  className={`h-0.5 flex-1 rounded-full transition ${
                    done ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ─── STEP 1 — TIPO ──────────────────────────────────────── */}
      {step === 1 && (
        <div>
          <h2 className="text-[1.25rem] font-semibold tracking-[-.01em] text-[var(--text-primary)]">
            Qual o tipo de anúncio?
          </h2>
          <p className="mt-1 text-[.8125rem] text-[var(--text-muted)]">
            Escolha a categoria principal do que está vendendo.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {TYPES.map((t) => {
              const active = listingType === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setListingType(t.key)}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                    active
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] shadow-[0_0_0_3px_var(--primary-soft)]"
                      : "border-[var(--border)] bg-white hover:border-[var(--border-strong)]"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${
                      active ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-soft)] text-[var(--text-muted)]"
                    }`}
                  >
                    <t.Icon size={18} />
                  </div>
                  <div>
                    <p className="text-[.875rem] font-semibold text-[var(--text-primary)]">{t.label}</p>
                    <p className="mt-0.5 text-[.6875rem] leading-tight text-[var(--text-muted)]">{t.hint}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              disabled={!canAdvance1}
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 text-[.875rem] font-semibold text-white shadow-[var(--shadow-green)] transition-all hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Próximo
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 2 — DADOS ─────────────────────────────────────── */}
      {step === 2 && (
        <div>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="mb-4 inline-flex items-center gap-1.5 text-[.75rem] font-medium text-[var(--text-muted)] transition hover:text-[var(--text-secondary)]"
          >
            <ArrowLeft size={12} /> Voltar
          </button>
          <h2 className="text-[1.25rem] font-semibold tracking-[-.01em] text-[var(--text-primary)]">
            Detalhes do anúncio
          </h2>
          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-[.8125rem] font-semibold text-[var(--text-primary)]">
                Título do anúncio
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: 120 Nelore PO — 420 kg, Halal certificado"
                className={inputCls}
                maxLength={120}
              />
              <p className="mt-1 text-[.6875rem] text-[var(--text-muted)]">
                {title.length}/120 caracteres
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-[.8125rem] font-semibold text-[var(--text-primary)]">
                Descrição <span className="font-normal text-[var(--text-muted)]">(opcional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Histórico, raça, pasto, certificações ativas, prazo de entrega..."
                className={`${inputCls} resize-none`}
                maxLength={2000}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[.8125rem] font-semibold text-[var(--text-primary)]">
                Categoria <span className="font-normal text-[var(--text-muted)]">(opcional)</span>
              </label>
              <input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Nelore PO, Soja convencional, Arroba gorda..."
                className={inputCls}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_.8fr_.8fr]">
              <div>
                <label className="mb-1.5 block text-[.8125rem] font-semibold text-[var(--text-primary)]">
                  Preço por unidade (R$)
                </label>
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  value={price || ""}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  placeholder="350.00"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[.8125rem] font-semibold text-[var(--text-primary)]">
                  Unidade
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Selecione</option>
                  {units.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[.8125rem] font-semibold text-[var(--text-primary)]">
                  Quantidade
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value, 10) || 0)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              disabled={!canAdvance2}
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 text-[.875rem] font-semibold text-white shadow-[var(--shadow-green)] transition-all hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Próximo
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3 — LOCATION + PUBLISH ────────────────────────── */}
      {step === 3 && (
        <div>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="mb-4 inline-flex items-center gap-1.5 text-[.75rem] font-medium text-[var(--text-muted)] transition hover:text-[var(--text-secondary)]"
          >
            <ArrowLeft size={12} /> Voltar
          </button>
          <h2 className="text-[1.25rem] font-semibold tracking-[-.01em] text-[var(--text-primary)]">
            Localização e certificações
          </h2>

          <div className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
              <div>
                <label className="mb-1.5 block text-[.8125rem] font-semibold text-[var(--text-primary)]">
                  Cidade
                </label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Jussara"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[.8125rem] font-semibold text-[var(--text-primary)]">
                  UF
                </label>
                <select
                  value={uf}
                  onChange={(e) => setUf(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Selecione</option>
                  {UFS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-4 transition hover:border-[var(--border-strong)]">
              <input
                type="checkbox"
                checked={halal}
                onChange={(e) => setHalal(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-[var(--primary)]"
              />
              <div>
                <p className="text-[.875rem] font-semibold text-[var(--text-primary)]">
                  Marcar Halal certificado
                </p>
                <p className="mt-0.5 text-[.75rem] leading-[1.55] text-[var(--text-muted)]">
                  Só marque se tiver certificação vigente. A Agraas faz verificação periódica.
                </p>
              </div>
            </label>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[.8125rem] text-red-700">
              {error}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-4">
            <Link
              href="/marketplace"
              className="text-[.8125rem] font-medium text-[var(--text-muted)] transition hover:text-[var(--text-secondary)]"
            >
              Cancelar
            </Link>
            <button
              type="button"
              disabled={!canSubmit || loading}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 text-[.875rem] font-semibold text-white shadow-[var(--shadow-green)] transition-all hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Publicando
                </>
              ) : (
                <>
                  Publicar anúncio
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
