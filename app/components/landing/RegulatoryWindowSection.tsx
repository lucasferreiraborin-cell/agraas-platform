import { FadeIn, StaggerContainer, StaggerItem } from "@/app/components/ui/Motion";

// Janela regulatória 2026 — argumento de "por que agora" para o público
// institucional/financeiro. Todos os números foram verificados contra a
// legislação vigente em 06/07/2026 (LC 224/2025, LC 214/2025, cronograma NFP-e
// por UF, nota RFB 31/07/2026 CNPJ alfanumérico). Frases deliberadamente
// precisas: IBS/CBS é fase de testes compensável (não "cobrança real"), e o
// Segurado Especial do FUNRURAL foi mantido por exclusão legal expressa.
const STATS = [
  {
    tag: "NFP-e",
    value: "05/01/2026",
    text: "Nota Fiscal do Produtor eletrônica obrigatória para todo produtor rural — extensão da fase iniciada em fev/2025 para quem faturava acima de R$ 360 mil/ano.",
  },
  {
    tag: "FUNRURAL · LC 224/2025",
    value: "01/04/2026",
    text: "Novas alíquotas em vigor: PF 1,63% e PJ 2,23%. O segurado especial (agricultura familiar) foi mantido em 1,50% por exclusão expressa da lei.",
  },
  {
    tag: "Reforma tributária · IBS/CBS",
    value: "Fase de testes",
    text: "Alíquota combinada de 1% (compensável) já rodando em 2026. Produtor rural acima de R$ 3,6 mi/ano passa a contribuinte pleno — com campos novos obrigatórios na nota.",
  },
  {
    tag: "CNPJ alfanumérico",
    value: "31/07/2026",
    text: "Novo formato entra para as inscrições a partir dessa data. CNPJs existentes permanecem — mas toda nova holding ou filial rural já nasce no modelo novo.",
  },
];

export default function RegulatoryWindowSection() {
  return (
    <section className="bg-[var(--bg)]">
      <div className="mx-auto max-w-[1200px] px-6 py-24 lg:px-10 lg:py-28">
        <div className="max-w-[820px]">
          <FadeIn>
            <p className="text-[.75rem] font-semibold uppercase tracking-[.22em] text-[var(--primary)]">
              Janela regulatória · 2026
            </p>
          </FadeIn>
          <FadeIn delay={0.08}>
            <h2 className="mt-5 text-[clamp(1.8rem,4vw,2.8rem)] font-medium leading-[1.08] tracking-[-.02em] text-[var(--text-primary)] [text-wrap:balance]">
              2026 é o ano em que o fiscal do agro deixa de ser opcional.
            </h2>
          </FadeIn>
          <FadeIn delay={0.16}>
            <p className="mt-6 max-w-[720px] text-[1rem] leading-[1.8] text-[var(--text-secondary)]">
              Um conjunto de mudanças regulatórias transforma a gestão fiscal e contábil estruturada em obrigação — não mais em diferencial. A janela para se adequar está aberta agora.
            </p>
          </FadeIn>
        </div>

        <StaggerContainer
          className="mt-14 grid gap-6 sm:grid-cols-2"
          staggerChildren={0.08}
        >
          {STATS.map((s) => (
            <StaggerItem key={s.tag}>
              <div className="flex h-full flex-col rounded-2xl border border-[var(--border)] bg-white p-8 shadow-[var(--shadow-soft)] transition-colors hover:border-[var(--primary)]/25">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-[.6875rem] font-semibold uppercase tracking-[.16em] text-[var(--primary)]">
                    {s.tag}
                  </p>
                  <p className="text-[.8125rem] font-semibold tabular-nums text-[var(--text-muted)]">
                    {s.value}
                  </p>
                </div>
                <p className="mt-4 text-[.9375rem] leading-[1.75] text-[var(--text-muted)]">
                  {s.text}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <FadeIn delay={0.3}>
          <p className="mt-12 max-w-[780px] border-l-4 border-[var(--primary)] pl-6 text-[1rem] leading-[1.8] text-[var(--text-secondary)]">
            Quem ainda opera no talão e no contador reativo vai sentir a régua apertar em 2026. A Agraas já nasce dentro dela — NF-e multimodal, LCDPR, apuração contábil automática e regime tributário parametrizado por produtor.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
