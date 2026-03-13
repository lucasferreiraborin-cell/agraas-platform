const stats = [
  {
    title: "Receita projetada",
    value: "R$ 8,4 mi",
    detail: "Visão consolidada por operação e unidade",
  },
  {
    title: "Taxa de crescimento",
    value: "+18,7%",
    detail: "Comparativo com o ciclo anterior",
  },
  {
    title: "Eficiência por lote",
    value: "93,2%",
    detail: "Monitoramento de produtividade e perdas",
  },
  {
    title: "Alertas críticos",
    value: "07",
    detail: "Ocorrências que exigem atenção imediata",
  },
];

export default function StatsGrid() {
  return (
    <section id="dashboard" className="mx-auto max-w-7xl px-6 py-16">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-300/70">
          Indicadores estratégicos
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-white">
          Uma visão premium do negócio agro em tempo real
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition hover:border-emerald-400/20 hover:bg-white/[0.06]"
          >
            <p className="text-sm text-white/45">{stat.title}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{stat.value}</p>
            <p className="mt-3 text-sm leading-6 text-white/55">{stat.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}