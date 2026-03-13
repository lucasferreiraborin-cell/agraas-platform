const animals = [
  {
    icon: "🐂",
    title: "Bovinos",
    detail: "Controle por lote, peso, ganho médio, sanidade e movimentações.",
  },
  {
    icon: "🐄",
    title: "Leite",
    detail: "Produção diária, histórico por animal, qualidade e desempenho do rebanho.",
  },
  {
    icon: "🐖",
    title: "Suínos",
    detail: "Eficiência de manejo, ciclos, engorda e acompanhamento operacional.",
  },
  {
    icon: "🐑",
    title: "Ovinos",
    detail: "Histórico individual, rastreabilidade e indicadores de produtividade.",
  },
  {
    icon: "🐔",
    title: "Avicultura",
    detail: "Gestão de lotes, mortalidade, consumo e produção por período.",
  },
  {
    icon: "🐎",
    title: "Equinos",
    detail: "Registro premium, histórico, perfil zootécnico e controle detalhado.",
  },
];

export default function AnimalCategories() {
  return (
    <section id="animais" className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300/70">
            Inteligência por categoria
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-white">
            Ícones, organização visual e leitura rápida por tipo de animal
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-white/50">
          A plataforma pode ser adaptada para diferentes cadeias produtivas, com leitura clara,
          identidade visual própria e profundidade de dados por espécie.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {animals.map((animal) => (
          <div
            key={animal.title}
            className="group rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.03] p-6 transition hover:border-emerald-400/20 hover:shadow-[0_0_40px_rgba(16,185,129,0.08)]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-3xl transition group-hover:scale-105">
              {animal.icon}
            </div>
            <h3 className="mt-5 text-xl font-semibold text-white">{animal.title}</h3>
            <p className="mt-3 text-sm leading-6 text-white/55">{animal.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}