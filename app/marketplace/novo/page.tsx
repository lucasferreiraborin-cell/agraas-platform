import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import PublicShell from "@/app/components/ui/PublicShell";
import NewListingForm, { type AnimalPrefill } from "@/app/components/marketplace/NewListingForm";

export const metadata: Metadata = {
  title: "Publicar anúncio",
  description: "Publique seu animal, safra, insumo ou equipamento no Marketplace Agraas.",
};

type SearchParams = { animal_id?: string };

// Anúncio em 1 clique a partir do passaporte do animal (09/11/2026): reduz
// liquidez a quase zero esforço pra quem já usa a Agraas — o anúncio vira
// subproduto do rastreio, não produto novo a adotar. Score é sempre lido do
// servidor (animal_scores), nunca aceito do cliente, pra não dar pra forjar.
async function fetchAnimalPrefill(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  animalId: string,
  clientId: string,
): Promise<AnimalPrefill | null> {
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
    animalId: animal.id,
    title: title.slice(0, 120),
    category: animal.breed ?? "",
    city: property?.city ?? "",
    uf: property?.state ?? "",
    score: scoreRow?.total_score != null ? Math.round(Number(scoreRow.total_score)) : null,
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

  const { animal_id } = await searchParams;

  let animalPrefill: AnimalPrefill | null = null;
  if (animal_id) {
    const { data: clientRow } = await supabase
      .from("clients")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();
    if (clientRow) {
      animalPrefill = await fetchAnimalPrefill(supabase, animal_id, clientRow.id);
    }
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-[760px] px-6 py-12 lg:py-16">
        <div className="mb-10">
          <p className="font-mono text-[.6875rem] font-semibold uppercase tracking-[.18em] text-[var(--primary)]">
            Publicar anúncio
          </p>
          <h1 className="mt-4 text-[clamp(1.8rem,4vw,2.6rem)] font-semibold leading-[1.1] tracking-[-.02em] text-[var(--text-primary)]">
            Seu anúncio no Marketplace Agro.
          </h1>
          <p className="mt-3 max-w-[540px] text-[.9375rem] leading-[1.7] text-[var(--text-muted)]">
            {animalPrefill
              ? "Dados do animal já preenchidos a partir do passaporte — confirme e defina o preço."
              : "Score Agraas e certificações do animal ou talhão entram automaticamente — você só publica o que vende e em que condições."}
          </p>
        </div>

        <NewListingForm animalPrefill={animalPrefill} />
      </div>
    </PublicShell>
  );
}
