import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import NewListingForm, { type QuickPrefill } from "@/app/components/marketplace/NewListingForm";

export const metadata: Metadata = {
  title: "Publicar anúncio",
  description: "Publique seu animal, safra, insumo ou equipamento no Marketplace Agraas.",
};

type SearchParams = { animal_id?: string; lot_id?: string };

// Anúncio em 1 clique a partir de dado real já cadastrado (09/11/2026): reduz
// liquidez a quase zero esforço pra quem já usa a Agraas — o anúncio vira
// subproduto do rastreio, não produto novo a adotar. Score é sempre lido do
// servidor (animal_scores), nunca aceito do cliente, pra não dar pra forjar.
async function fetchAnimalPrefill(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  animalId: string,
  clientId: string,
): Promise<QuickPrefill | null> {
  const { data: animal } = await supabase
    .from("animals")
    .select("id, internal_code, breed, sex, category, current_property_id, client_id")
    .eq("id", animalId)
    .maybeSingle();

  // Só pré-preenche com animal do próprio cliente — nunca de outro.
  if (!animal || animal.client_id !== clientId) return null;

  const [{ data: property }, { data: scoreRow }] = await Promise.all([
    animal.current_property_id
      ? supabase.from("properties").select("city, state").eq("id", animal.current_property_id).maybeSingle()
      : Promise.resolve({ data: null as { city: string | null; state: string | null } | null }),
    supabase
      .from("animal_scores")
      .select("total_score")
      .eq("animal_id", animalId)
      .in("algorithm_version", ["v3", "v3.1", "v3.2"])
      .maybeSingle(),
  ]);

  const titleParts = [animal.breed, animal.category].filter(Boolean);
  const title = `${titleParts.join(" — ") || "Bovino"} (${animal.internal_code ?? animalId.slice(0, 8)})`;

  return {
    kind: "animal",
    id: animal.id,
    title: title.slice(0, 120),
    category: animal.breed ?? "",
    city: property?.city ?? "",
    uf: property?.state ?? "",
    score: scoreRow?.total_score != null ? Math.round(Number(scoreRow.total_score)) : null,
    quantity: 1,
  };
}

// Lote: lógica de mercado real é vender o lote inteiro, não cabeça avulsa.
// Título e raça vêm agregados dos animais ainda ativos no lote
// (animal_lot_assignments, exit_date IS NULL — mesma fonte que /lotes/[id]
// já usa); score é a média dos scores reais, não inventado.
async function fetchLotPrefill(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  lotId: string,
  clientId: string,
): Promise<QuickPrefill | null> {
  const { data: lot } = await supabase
    .from("lots")
    .select("id, name, property_id, client_id")
    .eq("id", lotId)
    .maybeSingle();

  if (!lot || lot.client_id !== clientId) return null;

  const [{ data: assignments }, { data: property }] = await Promise.all([
    supabase.from("animal_lot_assignments").select("animal_id").eq("lot_id", lotId).is("exit_date", null),
    lot.property_id
      ? supabase.from("properties").select("city, state").eq("id", lot.property_id).maybeSingle()
      : Promise.resolve({ data: null as { city: string | null; state: string | null } | null }),
  ]);

  const animalIds = (assignments ?? []).map((a) => a.animal_id).filter(Boolean);
  if (animalIds.length === 0) return null;

  const [{ data: animals }, { data: scoreRows }] = await Promise.all([
    supabase.from("animals").select("breed").in("id", animalIds),
    supabase
      .from("animal_scores")
      .select("total_score")
      .in("animal_id", animalIds)
      .in("algorithm_version", ["v3", "v3.1", "v3.2"]),
  ]);

  // Raça predominante no lote, pro título — maioria simples, não precisão.
  const breedCounts = new Map<string, number>();
  for (const a of animals ?? []) {
    if (!a.breed) continue;
    breedCounts.set(a.breed, (breedCounts.get(a.breed) ?? 0) + 1);
  }
  const mainBreed = [...breedCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const mixedBreeds = breedCounts.size > 1;

  const scores = (scoreRows ?? [])
    .map((s) => Number(s.total_score))
    .filter((v) => !Number.isNaN(v));
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((sum, v) => sum + v, 0) / scores.length) : null;

  const breedLabel = mainBreed ? (mixedBreeds ? `${mainBreed} e outras raças` : mainBreed) : "Bovinos";
  const title = `${lot.name} — ${breedLabel}, ${animalIds.length} cabeças`.slice(0, 120);

  return {
    kind: "lot",
    id: lot.id,
    title,
    category: mainBreed ?? "",
    city: property?.city ?? "",
    uf: property?.state ?? "",
    score: avgScore,
    quantity: animalIds.length,
  };
}

export default async function NewListingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/marketplace/novo");
  }

  const { animal_id, lot_id } = await searchParams;

  let prefill: QuickPrefill | null = null;
  if (animal_id || lot_id) {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();
    if (clientRow) {
      prefill = animal_id
        ? await fetchAnimalPrefill(supabase, animal_id, clientRow.id)
        : await fetchLotPrefill(supabase, lot_id!, clientRow.id);
    }
  }

  // Página exige login (redirect acima) — usuário público nunca chega aqui,
  // então PublicShell nunca deveria envolver isto (mesmo bug de cabeçalho
  // duplicado achado e corrigido em /marketplace/[id] nesta sessão, 09/11).
  return (
    <main>
      <div className="mx-auto max-w-[760px] px-6 py-12 lg:py-16">
        <div className="mb-10">
          <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
            Publicar anúncio
          </p>
          <h1 className="mt-4 text-[clamp(1.8rem,4vw,2.6rem)] font-semibold leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
            Seu anúncio no Marketplace Agro.
          </h1>
          <p className="mt-3 max-w-[540px] text-[.9375rem] leading-[1.7] text-[var(--text-muted)]">
            {prefill
              ? "Dados já preenchidos a partir do que você já tem cadastrado — confirme e defina o preço."
              : "Score Agraas e certificações do animal ou talhão entram automaticamente — você só publica o que vende e em que condições."}
          </p>
        </div>

        <NewListingForm prefill={prefill} />
      </div>
    </main>
  );
}
