"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { Truck } from "lucide-react";
import { showToast } from "@/app/components/Toast";
import { BackLink } from "@/app/components/ui/BackLink";

// ─────────────────────────────────────────────────────────────────────────────
// Registro de GTA (Guia de Trânsito Animal)
//
// Client component com insert direto (RLS via publishable key + cookies).
// DEFENSIVO: se a migration 157 ainda não rodou, o insert em `gta` devolve erro
// (tabela inexistente) — mostramos toast honesto e não quebramos a tela.
// Propriedades/lotes são carregados via browser client; se falharem, os selects
// caem para "nenhuma opção" sem derrubar o formulário.
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

const FINALIDADES = [
  { value: "venda", label: "Venda" },
  { value: "transferencia", label: "Transferência" },
  { value: "abate", label: "Abate" },
  { value: "exposicao", label: "Exposição" },
  { value: "outro", label: "Outro" },
];

const STATUSES = [
  { value: "emitida", label: "Emitida" },
  { value: "em_transito", label: "Em trânsito" },
  { value: "recebida", label: "Recebida" },
  { value: "vencida", label: "Vencida" },
  { value: "cancelada", label: "Cancelada" },
];

type PropertyOption = { id: string; name: string; state: string | null };
type LotOption = { id: string; name: string };

export default function NovaGtaPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [lots, setLots] = useState<LotOption[]>([]);

  // Campos
  const [numero, setNumero] = useState("");
  const [serie, setSerie] = useState("");
  const [finalidade, setFinalidade] = useState("");
  const [origemPropertyId, setOrigemPropertyId] = useState("");
  const [destinoNome, setDestinoNome] = useState("");
  const [destinoUf, setDestinoUf] = useState("");
  const [especie, setEspecie] = useState("bovino");
  const [quantidade, setQuantidade] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [dataValidade, setDataValidade] = useState("");
  const [status, setStatus] = useState("emitida");
  const [lotId, setLotId] = useState("");
  const [notes, setNotes] = useState("");

  // Carrega opções (propriedades + lotes) — defensivo.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [propsRes, lotsRes] = await Promise.all([
        supabase.from("properties").select("id, name, state").order("name"),
        supabase.from("lots").select("id, name").order("name"),
      ]);
      if (cancelled) return;
      if (propsRes.error) console.error("[/gta/nova] properties:", propsRes.error.message);
      if (lotsRes.error) console.error("[/gta/nova] lots:", lotsRes.error.message);
      setProperties((propsRes.data ?? []) as PropertyOption[]);
      setLots((lotsRes.data ?? []) as LotOption[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit() {
    if (!finalidade) {
      showToast("Selecione a finalidade da GTA.", "error");
      return;
    }
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      showToast("Não autenticado.", "error");
      setSaving(false);
      return;
    }
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();
    if (!client) {
      showToast("Cliente não encontrado.", "error");
      setSaving(false);
      return;
    }

    const qty = quantidade.trim() ? Number.parseInt(quantidade.trim(), 10) : null;

    const { error } = await supabase.from("gta").insert({
      client_id: client.id,
      numero: numero.trim() || null,
      serie: serie.trim() || null,
      finalidade,
      origem_property_id: origemPropertyId || null,
      destino_nome: destinoNome.trim() || null,
      destino_uf: destinoUf.trim().toUpperCase() || null,
      especie: especie.trim() || "bovino",
      quantidade: Number.isFinite(qty as number) ? qty : null,
      data_emissao: dataEmissao || null,
      data_validade: dataValidade || null,
      status,
      lot_id: lotId || null,
      notes: notes.trim() || null,
    });

    setSaving(false);

    if (error) {
      // Caso típico enquanto a migration 157 não rodou: tabela inexistente.
      console.error("[/gta/nova] insert gta:", error.message);
      const pending = /relation .*gta.* does not exist|schema cache|not find the table/i.test(
        error.message,
      );
      showToast(
        pending
          ? "Módulo GTA ainda não provisionado no banco (migration 157 pendente)."
          : "Erro ao registrar a GTA.",
        "error",
      );
      return;
    }

    showToast("GTA registrada.");
    router.push("/gta");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-3xl">
      <BackLink href="/gta" label="Voltar para GTAs" />

      <section className="ag-card-strong p-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
            <Truck size={20} className="text-[var(--primary)]" />
          </span>
          <div>
            <h1 className="ag-page-title leading-none">Registrar GTA</h1>
            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              Guia de Trânsito Animal — origem, destino, finalidade e validade.
            </p>
          </div>
        </div>
      </section>

      <section className="ag-card mt-6 p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Número da guia">
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Ex.: 0012345678"
              className={inputCls}
            />
          </Field>
          <Field label="Série">
            <input
              value={serie}
              onChange={(e) => setSerie(e.target.value)}
              placeholder="Ex.: A"
              className={inputCls}
            />
          </Field>

          <Field label="Finalidade *">
            <select value={finalidade} onChange={(e) => setFinalidade(e.target.value)} className={inputCls}>
              <option value="">Selecione</option>
              {FINALIDADES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Origem (propriedade)">
            <select
              value={origemPropertyId}
              onChange={(e) => setOrigemPropertyId(e.target.value)}
              className={inputCls}
            >
              <option value="">Selecione a propriedade de origem</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.state ? ` (${p.state})` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lote vinculado (opcional)">
            <select value={lotId} onChange={(e) => setLotId(e.target.value)} className={inputCls}>
              <option value="">Nenhum</option>
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Destino (nome)">
            <input
              value={destinoNome}
              onChange={(e) => setDestinoNome(e.target.value)}
              placeholder="Fazenda / frigorífico de destino"
              className={inputCls}
            />
          </Field>
          <Field label="UF destino">
            <input
              value={destinoUf}
              onChange={(e) => setDestinoUf(e.target.value)}
              maxLength={2}
              placeholder="GO"
              className={inputCls}
            />
          </Field>

          <Field label="Espécie">
            <input value={especie} onChange={(e) => setEspecie(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Quantidade">
            <input
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              inputMode="numeric"
              placeholder="Ex.: 40"
              className={inputCls}
            />
          </Field>

          <Field label="Data de emissão">
            <input
              type="date"
              value={dataEmissao}
              onChange={(e) => setDataEmissao(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Data de validade">
            <input
              type="date"
              value={dataValidade}
              onChange={(e) => setDataValidade(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="mt-5">
          <Field label="Observações">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Notas internas sobre o trânsito."
              className={`${inputCls} resize-none`}
            />
          </Field>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="ag-button-primary flex-1 disabled:opacity-60"
            type="button"
          >
            {saving ? "Salvando..." : "Registrar GTA"}
          </button>
          <button
            onClick={() => router.push("/gta")}
            className="ag-button-secondary flex-1"
            type="button"
          >
            Cancelar
          </button>
        </div>
      </section>
    </main>
  );
}

const inputCls =
  "w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[var(--primary)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">{label}</label>
      {children}
    </div>
  );
}
