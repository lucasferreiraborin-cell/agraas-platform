/**
 * Planos de Ação por Sócio — ciclo de 90 dias (26/08/2026 → 24/11/2026).
 *
 * Fonte única dos três cenários estratégicos divididos entre os 5 sócios.
 * Consumido por `lib/socios-digest.ts` para que cada sócio receba, no digest
 * semanal, o plano DELE — tarefas atrasadas, o que vence nos próximos dias e
 * o progresso da fase corrente.
 *
 * Filosofia: dado estruturado em código, não planilha. Muda por commit,
 * fica versionado, e o digest reflete a verdade automaticamente. Quando o
 * ciclo virar rotina de várias equipes, migrar para tabela `partner_plans`
 * com RLS — hoje seria over-engineering para 5 pessoas e 3 planos.
 *
 * IMPORTANTE: este módulo NÃO importa de `socios-digest.ts` — a dependência é
 * de mão única (digest → planos) para evitar ciclo. A consistência dos e-mails
 * entre os dois catálogos é garantida por teste (`__tests__/planos-acao.test.ts`).
 *
 * Documento narrativo de origem: `AGRAAS-BRIEF-PLANOS-ACAO.md` (local, gitignored).
 */

// ---------------------------------------------------------------------------
// Sócios
// ---------------------------------------------------------------------------

export const SOCIO = {
  LUCAS: "lucas@agraas.com.br",
  EDUARDO: "eduardo@agraas.com.br",
  SALIM: "pedro.salim@agraas.com.br",
  MALULI: "pedro.maluli@agraas.com.br",
  FREDERICO: "frederico@agraas.com.br",
} as const;

export type SocioEmail = (typeof SOCIO)[keyof typeof SOCIO];

/** Papel de um sócio dentro de um plano específico. */
export type PapelNoPlano = "dono" | "apoio";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type TarefaStatus = "pendente" | "feita" | "cancelada";

export type Tarefa = {
  /** Identificador estável — usado para marcar conclusão sem depender do título. */
  id: string;
  titulo: string;
  dono: SocioEmail;
  /** Prazo em ISO `YYYY-MM-DD`. Comparado como string para não sofrer com fuso. */
  ate: string;
  /** Definition of done — o critério objetivo que encerra a tarefa. */
  dod?: string;
  status: TarefaStatus;
};

export type Fase = {
  nome: string;
  inicio: string;
  ate: string;
  tarefas: Tarefa[];
};

export type Metrica = {
  label: string;
  meta: string;
};

export type PlanoAcao = {
  cenario: 1 | 2 | 3;
  nome: string;
  objetivo: string;
  dono: SocioEmail;
  apoio: SocioEmail[];
  fases: Fase[];
  metricas: Metrica[];
  /** O que explicitamente NÃO é responsabilidade deste plano. Evita colisão. */
  foraDeEscopo: string[];
};

/** Decisão de Semana 0 que trava a execução de um ou mais planos. */
export type DecisaoBloqueante = {
  id: string;
  titulo: string;
  descricao: string;
  dono: SocioEmail;
  ate: string;
  bloqueia: Array<1 | 2 | 3>;
  status: TarefaStatus;
};

// ---------------------------------------------------------------------------
// Calendário do ciclo
// ---------------------------------------------------------------------------

export const CICLO = {
  inicio: "2026-08-26",
  fim: "2026-11-24",
  fase1: { inicio: "2026-08-26", ate: "2026-09-25" },
  fase2: { inicio: "2026-09-26", ate: "2026-10-25" },
  fase3: { inicio: "2026-10-26", ate: "2026-11-24" },
} as const;

// ---------------------------------------------------------------------------
// Semana 0 — decisões que travam os outros planos
// ---------------------------------------------------------------------------

export const DECISOES_SEMANA_ZERO: DecisaoBloqueante[] = [
  {
    id: "D1",
    titulo: "Fiscal ou rastreio no slide 3?",
    descricao:
      "Define o wedge do Plano 1 e a narrativa do Plano 2. Recomendação registrada: fiscal, " +
      "mantendo o rastreio como o ativo que vai para a mesa da iBoi.",
    dono: SOCIO.LUCAS,
    ate: "2026-09-01",
    bloqueia: [1, 2],
    status: "pendente",
  },
  {
    id: "D2",
    titulo: "Qual persona é a segunda a monetizar?",
    descricao:
      "Banco tem ticket alto e ciclo de 12 a 18 meses; frigorífico tem urgência regulatória; " +
      "contador é canal. Não dá para perseguir as três.",
    dono: SOCIO.LUCAS,
    ate: "2026-09-01",
    bloqueia: [2],
    status: "pendente",
  },
  {
    id: "D3",
    titulo: "Exclusividade com a iBoi: linha vermelha ou negociável?",
    descricao: "Define o mandato de negociação do Pedro Maluli antes de qualquer reunião.",
    dono: SOCIO.LUCAS,
    ate: "2026-09-01",
    bloqueia: [3],
    status: "pendente",
  },
];

// ---------------------------------------------------------------------------
// Plano 1 — Software-Only · Lucas (dono) + Frederico (apoio)
// ---------------------------------------------------------------------------

const PLANO_1: PlanoAcao = {
  cenario: 1,
  nome: "Software-Only",
  objetivo:
    "5 fazendas reais pagando, retidas por 60 dias ou mais. Não é feature entregue nem demo " +
    "bonita — é fazenda que passou o cartão e continuou usando no mês 3.",
  dono: SOCIO.LUCAS,
  apoio: [SOCIO.FREDERICO],
  fases: [
    {
      nome: "Tornar vendável",
      ...CICLO.fase1,
      tarefas: [
        {
          id: "P1-F1-01",
          titulo: "Fechar a decisão D1 (wedge fiscal ou rastreio)",
          dono: SOCIO.LUCAS,
          ate: "2026-09-01",
          dod: "Decisão escrita e comunicada aos 5 sócios",
          status: "pendente",
        },
        {
          id: "P1-F1-02",
          titulo: "Onboarding self-service ponta a ponta",
          dono: SOCIO.LUCAS,
          ate: "2026-09-25",
          dod: "Conta criada do zero sai com 100 animais dentro em menos de 15 min, sem tocar em SQL",
          status: "pendente",
        },
        {
          id: "P1-F1-03",
          titulo: "Separar tenant de demo do tenant de produção",
          dono: SOCIO.LUCAS,
          ate: "2026-09-25",
          dod: "Fazenda real entra sem enxergar nem herdar dado de seed",
          status: "pendente",
        },
        {
          id: "P1-F1-04",
          titulo: "Definir preço de piloto",
          dono: SOCIO.LUCAS,
          ate: "2026-09-25",
          dod: "Preço âncora com desconto de 3 meses publicado — preço não pode travar o teste",
          status: "pendente",
        },
        {
          id: "P1-F1-05",
          titulo: "Amarrar NF-e de Paulo, Pedro e Mentoria a vendas reais de animais",
          dono: SOCIO.LUCAS,
          ate: "2026-09-25",
          dod: "Rebanho ativo cai quando há venda fiscal — cruzamento fecha em qualquer drill-down",
          status: "pendente",
        },
        {
          id: "P1-F1-06",
          titulo: "Lista de 15 fazendas candidatas no ICP",
          dono: SOCIO.FREDERICO,
          ate: "2026-09-25",
          dod: "Planilha com nome, contato, tamanho do rebanho e quem apresenta. ICP: 300 a 2.000 cabeças, 1 a 3 propriedades",
          status: "pendente",
        },
        {
          id: "P1-F1-07",
          titulo: "5 conversas de descoberta com produtores",
          dono: SOCIO.FREDERICO,
          ate: "2026-09-25",
          dod: "5 respostas escritas para: como você fecha o mês com seu contador hoje, e quanto isso te custa?",
          status: "pendente",
        },
      ],
    },
    {
      nome: "Primeiros pagantes",
      ...CICLO.fase2,
      tarefas: [
        {
          id: "P1-F2-01",
          titulo: "3 fazendas onboarded com dado real",
          dono: SOCIO.FREDERICO,
          ate: "2026-10-25",
          dod: "Dado do produtor dentro da plataforma, não seed",
          status: "pendente",
        },
        {
          id: "P1-F2-02",
          titulo: "Cronometrar cada onboarding e registrar onde travou",
          dono: SOCIO.FREDERICO,
          ate: "2026-10-25",
          dod: "Log de fricção por fazenda — o documento mais valioso do trimestre",
          status: "pendente",
        },
        {
          id: "P1-F2-03",
          titulo: "Matar os 3 maiores pontos de fricção encontrados",
          dono: SOCIO.LUCAS,
          ate: "2026-10-25",
          dod: "Tempo de onboarding da 4a fazenda menor que o da 1a",
          status: "pendente",
        },
        {
          id: "P1-F2-04",
          titulo: "Primeira cobrança Stripe real ponta a ponta",
          dono: SOCIO.LUCAS,
          ate: "2026-10-25",
          dod: "Pagamento liquidado e assinatura ativa de um produtor de verdade",
          status: "pendente",
        },
        {
          id: "P1-F2-05",
          titulo: "Decisão app de campo: construir ou adiar",
          dono: SOCIO.LUCAS,
          ate: "2026-10-25",
          dod: "Avaliar PWA responsivo como alternativa barata ao app nativo. Decisão escrita",
          status: "pendente",
        },
      ],
    },
    {
      nome: "Provar retenção e canal",
      ...CICLO.fase3,
      tarefas: [
        {
          id: "P1-F3-01",
          titulo: "5 fazendas pagantes com uso semanal medido",
          dono: SOCIO.LUCAS,
          ate: "2026-11-24",
          dod: "Login e lançamentos por fazenda instrumentados e visíveis",
          status: "pendente",
        },
        {
          id: "P1-F3-02",
          titulo: "1 contador rural parceiro com 3 fazendas dele dentro",
          dono: SOCIO.FREDERICO,
          ate: "2026-11-24",
          dod: "É o teste do canal que sustenta a meta de 100 fazendas",
          status: "pendente",
        },
        {
          id: "P1-F3-03",
          titulo: "Relatório de retenção do ciclo",
          dono: SOCIO.LUCAS,
          ate: "2026-11-24",
          dod: "Quem usou, quem sumiu, por quê",
          status: "pendente",
        },
      ],
    },
  ],
  metricas: [
    { label: "Fazendas pagantes", meta: "5" },
    { label: "Retenção em 60 dias", meta: "4 de 5 ou mais" },
    { label: "Tempo de onboarding", meta: "menos de 1 dia" },
    { label: "Lançamentos por semana por fazenda", meta: "3 ou mais" },
    { label: "Contador parceiro ativo", meta: "1" },
  ],
  foraDeEscopo: [
    "Deck de investidor",
    "Negociação com a iBoi",
    "Modelagem financeira de 3 anos",
  ],
};

// ---------------------------------------------------------------------------
// Plano 2 — Tese Completa / Captação · Eduardo (dono) + Salim (apoio)
// ---------------------------------------------------------------------------

const PLANO_2: PlanoAcao = {
  cenario: 2,
  nome: "Tese Completa / Captação",
  objetivo:
    "Material de captação pronto, testado e defensável — sem pedir cheque cedo demais. " +
    "Sair a mercado antes de ter tração do Plano 1 queima investidor: não se pede duas vezes.",
  dono: SOCIO.EDUARDO,
  apoio: [SOCIO.SALIM],
  fases: [
    {
      nome: "Fundação numérica",
      ...CICLO.fase1,
      tarefas: [
        {
          id: "P2-F1-01",
          titulo: "Modelo financeiro de 3 anos, bottom-up, com os 3 cenários como abas",
          dono: SOCIO.EDUARDO,
          ate: "2026-09-25",
          dod: "Trocar uma premissa recalcula tudo sozinho. Premissas visíveis, nunca embutidas em fórmula",
          status: "pendente",
        },
        {
          id: "P2-F1-02",
          titulo: "Unit economics: CAC, LTV, payback e margem bruta por plano",
          dono: SOCIO.EDUARDO,
          ate: "2026-09-25",
          dod: "Ancorado em Aegro (~R$ 6.000 por fazenda por ano) e Omie (~R$ 3.300 por cliente por ano)",
          status: "pendente",
        },
        {
          id: "P2-F1-03",
          titulo: "Responder com número: R$ 699 por mês se sustenta?",
          dono: SOCIO.EDUARDO,
          ate: "2026-09-25",
          dod: "Resposta devolvida ao Plano 1 até 25/09 — hoje o preço está acima dos dois comparáveis",
          status: "pendente",
        },
        {
          id: "P2-F1-04",
          titulo: "Auditoria do deck atual",
          dono: SOCIO.SALIM,
          ate: "2026-09-25",
          dod: "Lista do que sobrevive, do que morre e do que falta",
          status: "pendente",
        },
        {
          id: "P2-F1-05",
          titulo: "Mapear 20 investidores-alvo pré-seed agtech BR",
          dono: SOCIO.SALIM,
          ate: "2026-09-25",
          dod: "Tese declarada compatível. Mapear apenas — não abordar ninguém nesta fase",
          status: "pendente",
        },
      ],
    },
    {
      nome: "Construir o material",
      ...CICLO.fase2,
      tarefas: [
        {
          id: "P2-F2-01",
          titulo: "Deck v1 com o cenário-líder no slide 3",
          dono: SOCIO.SALIM,
          ate: "2026-10-25",
          dod: "Tese completa no slide 12, nunca o contrário. Depende da decisão D1",
          status: "pendente",
        },
        {
          id: "P2-F2-02",
          titulo: "Data room embrionário",
          dono: SOCIO.EDUARDO,
          ate: "2026-10-25",
          dod: "Cap table, contratos, métricas de plataforma e dossiê técnico organizados",
          status: "pendente",
        },
        {
          id: "P2-F2-03",
          titulo: "Transformar a validação científica do Score em 1 slide citável",
          dono: SOCIO.SALIM,
          ate: "2026-10-25",
          dod: "O lastro IZ-SP e Embrapa quem busca é o Lucas na mentoria. Salim empacota",
          status: "pendente",
        },
        {
          id: "P2-F2-04",
          titulo: "Incorporar ao modelo os números reais dos Planos 1 e 3",
          dono: SOCIO.EDUARDO,
          ate: "2026-10-25",
          dod: "Tração de fazenda e base instalada da iBoi substituem premissas",
          status: "pendente",
        },
      ],
    },
    {
      nome: "Estressar antes de expor",
      ...CICLO.fase3,
      tarefas: [
        {
          id: "P2-F3-01",
          titulo: "Ensaiar o pitch com 3 pessoas de fora",
          dono: SOCIO.SALIM,
          ate: "2026-11-24",
          dod: "Mentor Rodrigo, alguém do agro e alguém de VC",
          status: "pendente",
        },
        {
          id: "P2-F3-02",
          titulo: "Perguntas matadoras com respostas escritas",
          dono: SOCIO.EDUARDO,
          ate: "2026-11-24",
          dod: "As 7 perguntas do brief de cenários respondidas por escrito",
          status: "pendente",
        },
        {
          id: "P2-F3-03",
          titulo: "Primeiras conversas exploratórias com investidores",
          dono: SOCIO.SALIM,
          ate: "2026-11-24",
          dod: "Conversas exploratórias — explicitamente não é pedido de cheque",
          status: "pendente",
        },
      ],
    },
  ],
  metricas: [
    { label: "Modelo financeiro", meta: "aguenta 3 perguntas seguidas sem quebrar" },
    { label: "Deck ensaiado", meta: "3 vezes, com gente de fora" },
    { label: "Investidores mapeados", meta: "20" },
    { label: "Perguntas matadoras respondidas", meta: "7 de 7, por escrito" },
    { label: "Cheques pedidos", meta: "0 — proposital" },
  ],
  foraDeEscopo: [
    "Prometer feature que não existe",
    "Negociar com a iBoi",
    "Definir roadmap de produto",
  ],
};

// ---------------------------------------------------------------------------
// Plano 3 — Agraas × iBoi · Maluli (dono) + Lucas (apoio técnico)
// ---------------------------------------------------------------------------

const PLANO_3: PlanoAcao = {
  cenario: 3,
  nome: "Agraas x iBoi",
  objetivo:
    "Term sheet de parceria assinado, ou um não agora explícito. O pior resultado possível " +
    "não é o não: é a conversa boa que apodrece por seis meses.",
  dono: SOCIO.MALULI,
  apoio: [SOCIO.LUCAS],
  fases: [
    {
      nome: "Levantar o que não sabemos",
      ...CICLO.fase1,
      tarefas: [
        {
          id: "P3-F1-01",
          titulo: "Os 6 números da iBoi",
          dono: SOCIO.MALULI,
          ate: "2026-09-09",
          dod:
            "Por escrito: brincos ativos hoje; meta 12 meses; ticket do hardware e se é venda ou comodato; " +
            "custo e receita de conectividade por animal por mês; churn da base conectada; geografia e perfil das fazendas. " +
            "É o gate do plano inteiro — sem isso qualquer proposta é aritmética sobre variável vazia",
          status: "pendente",
        },
        {
          id: "P3-F1-02",
          titulo: "Mapa de decisão na UP2Tech",
          dono: SOCIO.MALULI,
          ate: "2026-09-25",
          dod: "Quem assina, quem veta, quem influencia",
          status: "pendente",
        },
        {
          id: "P3-F1-03",
          titulo: "Entender o modelo comercial da iBoi",
          dono: SOCIO.MALULI,
          ate: "2026-09-25",
          dod: "Vendem direto, por revenda ou via cooperativa? Determina como a assinatura Agraas seria cobrada",
          status: "pendente",
        },
      ],
    },
    {
      nome: "Montar a proposta",
      ...CICLO.fase2,
      tarefas: [
        {
          id: "P3-F2-01",
          titulo: "Proposta de revenue share por animal conectado por mês",
          dono: SOCIO.MALULI,
          ate: "2026-10-25",
          dod: "Com faixas por volume. Referência de calibragem: R$ 3 por animal por mês em 50 mil animais a 50/50 é cerca de R$ 900 mil de ARR",
          status: "pendente",
        },
        {
          id: "P3-F2-02",
          titulo: "Linhas vermelhas escritas antes de sentar",
          dono: SOCIO.MALULI,
          ate: "2026-09-25",
          dod:
            "Validadas com Lucas via D3: sem exclusividade ampla (se houver, cara, curta e restrita a bovinos com brinco); " +
            "IP de Score e Fiscal 100% Agraas; sem white-label no ano 1; nada de equity ou aquisição nesta rodada",
          status: "pendente",
        },
        {
          id: "P3-F2-03",
          titulo: "Definir o piloto conjunto",
          dono: SOCIO.MALULI,
          ate: "2026-10-25",
          dod: "1 fazenda, N brincos, 90 dias, critério de sucesso por escrito",
          status: "pendente",
        },
        {
          id: "P3-F2-04",
          titulo: "Escopo técnico da API de telemetria",
          dono: SOCIO.LUCAS,
          ate: "2026-10-25",
          dod: "Esforço, prazo e o que precisamos da iBoi. Maluli não promete prazo de API sem este número",
          status: "pendente",
        },
      ],
    },
    {
      nome: "Fechar ou encerrar",
      ...CICLO.fase3,
      tarefas: [
        {
          id: "P3-F3-01",
          titulo: "Term sheet assinado ou no-go explícito",
          dono: SOCIO.MALULI,
          ate: "2026-11-24",
          dod: "Registrado por escrito de qualquer forma — não deixar apodrecer",
          status: "pendente",
        },
        {
          id: "P3-F3-02",
          titulo: "Piloto conjunto rodando, se houver acordo",
          dono: SOCIO.FREDERICO,
          ate: "2026-11-24",
          dod: "Frederico no campo com os brincos instalados",
          status: "pendente",
        },
      ],
    },
  ],
  metricas: [
    { label: "Números da iBoi em mãos", meta: "até 09/09" },
    { label: "Linhas vermelhas aprovadas por escrito", meta: "até 25/09" },
    { label: "Term sheet ou no-go", meta: "até 24/11" },
    { label: "Concessões fora das linhas vermelhas", meta: "0" },
  ],
  foraDeEscopo: [
    "Prometer prazo de desenvolvimento sem o Lucas",
    "Discutir equity ou aquisição",
    "Oferecer o módulo fiscal — esse não entra na parceria",
  ],
};

export const PLANOS_90D: PlanoAcao[] = [PLANO_1, PLANO_2, PLANO_3];

/**
 * Regra que impede os planos de colidirem.
 *
 * Se o Maluli oferece rastreio para a iBoi enquanto o Frederico vende rastreio
 * para a fazenda, os dois negociam o mesmo ativo em dois lugares com preços
 * diferentes. O Plano 1 vende fiscal e gestão; o rastreio é a moeda do Plano 3.
 */
export const REGRA_ANTI_COLISAO =
  "Rastreio só é comercializado diretamente com aval explícito do Lucas. " +
  "O Plano 1 vende fiscal e gestão. O rastreio é a moeda do Plano 3.";

// ---------------------------------------------------------------------------
// Helpers de leitura
// ---------------------------------------------------------------------------

/** Data de hoje em ISO `YYYY-MM-DD`, no fuso de São Paulo. */
export function hojeISO(agora: Date = new Date()): string {
  // en-CA formata como YYYY-MM-DD, que é exatamente o shape ISO que usamos.
  return agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

/** Diferença em dias entre duas datas ISO. Positivo = `ate` está no futuro. */
export function diasAte(ate: string, hoje: string = hojeISO()): number {
  // Meio-dia UTC evita que horário de verão ou fuso jogue o resultado um dia fora.
  const a = Date.parse(`${ate}T12:00:00Z`);
  const b = Date.parse(`${hoje}T12:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.NaN;
  return Math.round((a - b) / 86_400_000);
}

export type TarefaComContexto = Tarefa & {
  cenario: 1 | 2 | 3;
  plano: string;
  fase: string;
  /** Negativo quando a tarefa está atrasada. */
  diasRestantes: number;
};

/** Todos os planos em que o sócio aparece, como dono ou apoio. */
export function planosDoSocio(email: string): Array<{ plano: PlanoAcao; papel: PapelNoPlano }> {
  const out: Array<{ plano: PlanoAcao; papel: PapelNoPlano }> = [];
  for (const plano of PLANOS_90D) {
    if (plano.dono === email) out.push({ plano, papel: "dono" });
    else if ((plano.apoio as string[]).includes(email)) out.push({ plano, papel: "apoio" });
  }
  return out;
}

/** O plano do qual o sócio é dono. Null se ele só apoia. */
export function planoQueLidera(email: string): PlanoAcao | null {
  return PLANOS_90D.find(p => p.dono === email) ?? null;
}

/**
 * Tarefas atribuídas ao sócio — em qualquer plano, inclusive naquele que ele
 * apenas apoia. Ordenadas por prazo, mais urgente primeiro.
 */
export function tarefasDoSocio(
  email: string,
  opts: { status?: TarefaStatus; hoje?: string } = {},
): TarefaComContexto[] {
  const hoje = opts.hoje ?? hojeISO();
  const out: TarefaComContexto[] = [];

  for (const plano of PLANOS_90D) {
    for (const fase of plano.fases) {
      for (const tarefa of fase.tarefas) {
        if (tarefa.dono !== email) continue;
        if (opts.status && tarefa.status !== opts.status) continue;
        out.push({
          ...tarefa,
          cenario: plano.cenario,
          plano: plano.nome,
          fase: fase.nome,
          diasRestantes: diasAte(tarefa.ate, hoje),
        });
      }
    }
  }

  return out.sort((a, b) => a.ate.localeCompare(b.ate));
}

/** Pendentes cujo prazo já passou. */
export function tarefasAtrasadas(email: string, hoje: string = hojeISO()): TarefaComContexto[] {
  return tarefasDoSocio(email, { status: "pendente", hoje }).filter(t => t.diasRestantes < 0);
}

/** Pendentes que vencem de hoje até `dias` à frente (inclusive). */
export function tarefasVencendo(
  email: string,
  dias = 14,
  hoje: string = hojeISO(),
): TarefaComContexto[] {
  return tarefasDoSocio(email, { status: "pendente", hoje }).filter(
    t => t.diasRestantes >= 0 && t.diasRestantes <= dias,
  );
}

/** Fase corrente de um plano na data informada. Cai na última se o ciclo já terminou. */
export function faseCorrente(plano: PlanoAcao, hoje: string = hojeISO()): Fase {
  return (
    plano.fases.find(f => hoje >= f.inicio && hoje <= f.ate) ??
    (hoje < plano.fases[0].inicio ? plano.fases[0] : plano.fases[plano.fases.length - 1])
  );
}

/** Progresso de um plano — canceladas saem do denominador. */
export function progressoDoPlano(plano: PlanoAcao): { feitas: number; total: number; pct: number } {
  const tarefas = plano.fases.flatMap(f => f.tarefas).filter(t => t.status !== "cancelada");
  const feitas = tarefas.filter(t => t.status === "feita").length;
  const total = tarefas.length;
  return { feitas, total, pct: total === 0 ? 0 : Math.round((feitas / total) * 100) };
}

/** Decisões de Semana 0 ainda pendentes. Enquanto houver, há plano travado. */
export function decisoesPendentes(): DecisaoBloqueante[] {
  return DECISOES_SEMANA_ZERO.filter(d => d.status === "pendente");
}

/** Cenários bloqueados hoje por decisão pendente de Semana 0. */
export function cenariosBloqueados(): Array<1 | 2 | 3> {
  const set = new Set<1 | 2 | 3>();
  for (const d of decisoesPendentes()) for (const c of d.bloqueia) set.add(c);
  return [...set].sort();
}
