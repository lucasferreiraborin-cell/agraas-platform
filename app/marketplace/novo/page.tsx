import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import PublicShell from "@/app/components/ui/PublicShell";
import NewListingForm from "@/app/components/marketplace/NewListingForm";

export const metadata: Metadata = {
  title: "Publicar anúncio",
  description: "Publique seu animal, safra, insumo ou equipamento no Marketplace Agraas.",
};

export default async function NewListingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/marketplace/novo");
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
            Score Agraas e certificações do animal ou talhão entram automaticamente — você só publica o que vende e em que condições.
          </p>
        </div>

        <NewListingForm />
      </div>
    </PublicShell>
  );
}
