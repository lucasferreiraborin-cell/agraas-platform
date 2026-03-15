import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

type AnimalRow = {
  id: string;
  internal_code: string | null;
};

type ProductRow = {
  id: string;
  name: string | null;
};

type BatchRow = {
  id: string;
  product_id: string;
  batch_number: string | null;
  expiration_date: string | null;
  quantity: number | null;
};

async function registerApplication(formData: FormData) {
  "use server";

  const animalId = String(formData.get("animal_id") ?? "").trim();
  const productId = String(formData.get("product_id") ?? "").trim();
  const batchId = String(formData.get("batch_id") ?? "").trim();
  const doseRaw = String(formData.get("dose") ?? "").trim();
  const applicationDate = String(formData.get("application_date") ?? "").trim();

  if (!animalId || !productId || !batchId || !doseRaw || !applicationDate) {
    throw new Error("Preencha todos os campos antes de registrar a aplicação.");
  }

  const dose = Number(doseRaw);

  if (Number.isNaN(dose) || dose <= 0) {
    throw new Error("A dose informada é inválida.");
  }

  const { error } = await supabase.from("applications").insert({
    id: crypto.randomUUID(),
    animal_id: animalId,
    product_id: productId,
    batch_id: batchId,
    dose,
    application_date: applicationDate,
  });

  if (error) {
    throw new Error(`Erro ao registrar aplicação: ${error.message}`);
  }

  revalidatePath("/aplicacoes");
  revalidatePath("/animais");
  revalidatePath(`/animais/${animalId}`);
  revalidatePath("/");
}

export default async function AplicacoesPage() {
  const hoje = new Date().toISOString().slice(0, 10);

  const [{ data: animalsData }, { data: productsData }, { data: batchesData }] =
    await Promise.all([
      supabase
        .from("animals")
        .select("id, internal_code")
        .order("internal_code"),
      supabase
        .from("products")
        .select("id, name")
        .order("name"),
      supabase
        .from("stock_batches")
        .select("id, product_id, batch_number, expiration_date, quantity")
        .order("batch_number"),
    ]);

  const animals = (animalsData as AnimalRow[] | null) ?? [];
  const products = (productsData as ProductRow[] | null) ?? [];
  const batches = (batchesData as BatchRow[] | null) ?? [];

  return (
    <main className="space-y-8">
      <section className="ag-card-strong overflow-hidden">
        <div className="grid gap-0 xl:grid-cols-[1.02fr_0.98fr]">
          <div className="relative p-8 lg:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(122,168,76,0.18)_0%,rgba(122,168,76,0)_70%)]" />

            <div className="ag-badge ag-badge-green">Operação sanitária</div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] lg:text-6xl">
              Registrar aplicação
            </h1>

            <p className="mt-5 max-w-3xl text-[1.02rem] leading-8 text-[var(--text-secondary)]">
              Registre aplicações sanitárias com vínculo ao animal, produto e lote
              de insumo. Cada lançamento reforça a rastreabilidade e atualiza o
              passaporte vivo da Agraas.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <HeroMetric
                label="Animais disponíveis"
                value={animals.length}
                subtitle="ativos aptos para vínculo"
              />
              <HeroMetric
                label="Produtos"
                value={products.length}
                subtitle="insumos cadastrados"
              />
              <HeroMetric
                label="Lotes"
                value={batches.length}
                subtitle="estoque rastreável disponível"
              />
            </div>
          </div>

          <div className="border-t border-[var(--border)] bg-[linear-gradient(180deg,#eef6ea_0%,#f5f7f4_100%)] p-8 lg:p-10 xl:border-l xl:border-t-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  Checklist da operação
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  Estrutura da aplicação
                </h2>
              </div>

              <span className="ag-badge ag-badge-dark">Live form</span>
            </div>

            <div className="mt-8 grid gap-4">
              <ChecklistCard
                title="Vínculo com animal"
                description="Cada aplicação precisa estar associada a um animal específico."
              />
              <ChecklistCard
                title="Produto sanitário"
                description="Selecione o insumo correto para garantir consistência da base."
              />
              <ChecklistCard
                title="Lote rastreável"
                description="O lote é o elo entre estoque, compliance e histórico sanitário."
              />
              <ChecklistCard
                title="Impacto automático"
                description="Após registrar, o passaporte do animal é recalculado pela engine."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="ag-card p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="ag-section-title">Formulário de aplicação</h2>
            <p className="ag-section-subtitle">
              Preencha os campos abaixo para registrar uma aplicação sanitária
              vinculada ao animal e ao lote correspondente.
            </p>
          </div>

          <span className="ag-badge ag-badge-green">Rastreabilidade ativa</span>
        </div>

        <form action={registerApplication} className="mt-8 grid gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <FieldBlock label="Animal">
              <select
                name="animal_id"
                required
                className="ag-input"
                defaultValue=""
              >
                <option value="" disabled>
                  Selecione um animal
                </option>
                {animals.map((animal) => (
                  <option key={animal.id} value={animal.id}>
                    {animal.internal_code ?? animal.id}
                  </option>
                ))}
              </select>
            </FieldBlock>

            <FieldBlock label="Produto">
              <select
                name="product_id"
                required
                className="ag-input"
                defaultValue=""
              >
                <option value="" disabled>
                  Selecione um produto
                </option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name ?? product.id}
                  </option>
                ))}
              </select>
            </FieldBlock>

            <FieldBlock label="Lote de insumo">
              <select
                name="batch_id"
                required
                className="ag-input"
                defaultValue=""
              >
                <option value="" disabled>
                  Selecione um lote
                </option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batch_number ?? batch.id}
                    {batch.quantity !== null && batch.quantity !== undefined
                      ? ` • qtd ${batch.quantity}`
                      : ""}
                    {batch.expiration_date
                      ? ` • vence ${new Date(batch.expiration_date).toLocaleDateString("pt-BR")}`
                      : ""}
                  </option>
                ))}
              </select>
            </FieldBlock>

            <FieldBlock label="Dose">
              <input
                name="dose"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="Ex.: 10"
                className="ag-input"
              />
            </FieldBlock>

            <FieldBlock label="Data da aplicação">
              <input
                name="application_date"
                type="date"
                required
                defaultValue={hoje}
                className="ag-input"
              />
            </FieldBlock>
          </div>

          <div className="pt-2">
            <button type="submit" className="ag-button-primary">
              Registrar aplicação
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function HeroMetric({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-soft)] p-5">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {subtitle}
      </p>
    </div>
  );
}

function ChecklistCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-[var(--shadow-soft)]">
      <p className="text-base font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
        {title}
      </p>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>
    </div>
  );
}

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-3 block text-sm font-medium text-[var(--text-primary)]">
        {label}
      </span>
      {children}
    </label>
  );
}