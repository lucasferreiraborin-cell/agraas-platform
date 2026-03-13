export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-white/10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.12),transparent_20%),linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent)]" />
      <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-28">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Plataforma premium para gestão inteligente do agro
          </div>

          <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
            Dados, rebanho, operação e performance em uma plataforma com estética de elite.
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-white/65 sm:text-lg">
            A Agraas organiza a inteligência do campo em uma experiência visual moderna:
            indicadores em tempo real, acompanhamento por animal, produtividade, histórico,
            lotes, operações e dashboards estratégicos para decisão.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button className="rounded-2xl bg-emerald-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300">
              Ver plataforma
            </button>
            <button className="rounded-2xl border border-white/10 px-6 py-3 text-sm font-semibold text-white/85 transition hover:border-white/20 hover:bg-white/5">
              Explorar módulos
            </button>
          </div>

          <div className="mt-10 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-semibold text-white">+42%</p>
              <p className="mt-1 text-sm text-white/50">Eficiência operacional</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-semibold text-white">24/7</p>
              <p className="mt-1 text-sm text-white/50">Visão contínua</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-semibold text-white">100%</p>
              <p className="mt-1 text-sm text-white/50">Dados centralizados</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-2xl font-semibold text-white">AI Ready</p>
              <p className="mt-1 text-sm text-white/50">Base preparada para IA</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl">
            <div className="rounded-[24px] border border-white/10 bg-[#07110d] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/35">
                    Live command center
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-white">
                    Agraas Central Dashboard
                  </h3>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                  Online
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-sm text-white/45">Animais monitorados</p>
                  <p className="mt-2 text-3xl font-semibold text-white">12.480</p>
                  <p className="mt-2 text-sm text-emerald-300">+8,2% no mês</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-sm text-white/45">Lotes ativos</p>
                  <p className="mt-2 text-3xl font-semibold text-white">184</p>
                  <p className="mt-2 text-sm text-sky-300">visão por fazenda</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-4 md:col-span-2">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm text-white/45">Eficiência de produção</p>
                    <p className="text-xs text-white/35">Últimos 6 ciclos</p>
                  </div>

                  <div className="flex h-32 items-end gap-3">
                    {[42, 58, 51, 74, 68, 92].map((value, index) => (
                      <div key={index} className="flex flex-1 flex-col items-center gap-2">
                        <div
                          className="w-full rounded-t-xl bg-gradient-to-t from-emerald-500 to-emerald-300"
                          style={{ height: `${value}%` }}
                        />
                        <span className="text-xs text-white/35">C{index + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-6 -left-6 hidden rounded-2xl border border-white/10 bg-black/70 p-4 backdrop-blur-xl lg:block">
            <p className="text-xs uppercase tracking-[0.2em] text-white/35">Status</p>
            <p className="mt-1 text-sm text-white/70">Integração operacional estável</p>
          </div>
        </div>
      </div>
    </section>
  );
}