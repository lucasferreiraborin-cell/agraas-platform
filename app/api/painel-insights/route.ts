import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type Stats = {
  totalAnimals: number;
  totalScoreAverage: number;
  totalArrobas: number;
  totalProperties: number;
  withdrawals7d: number;
  noPesagem30d: number;
  shipmentsStale: number;
  lotsUpcoming: number;
  totalActiveAlerts: number;
  expiredCertsCount: number;
  estimatedValue: string;
  topAnimal: { code: string; score: number } | null;
  isFsjbePilot: boolean;
};

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 30, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Não autenticado", { status: 401 });

  let stats: Stats;
  try {
    stats = (await req.json()) as Stats;
  } catch {
    return new Response("Payload inválido", { status: 400 });
  }

  const pilotoNota = stats.isFsjbePilot
    ? "\nContexto adicional: trata-se do piloto FSJBE com dados ilustrativos enquanto o tombamento Multbovinos → Agraas é concluído. Foque em padrões e oportunidades genéricas, evite atribuir métricas absolutas como definitivas."
    : "";

  const contexto = `
Você é o Agro Assistant da Agraas, plataforma de rastreabilidade e inteligência da pecuária bovina brasileira.
Sua função aqui é gerar 3 frases curtas, diretas e em PT-BR sobre o estado operacional atual do rebanho monitorado.

Tom: profissional, executivo, sem floreios, sem AI startup. Pense em um relatório enviado por consultor sênior.${pilotoNota}

ESTADO ATUAL DO REBANHO:
- Animais monitorados: ${stats.totalAnimals}
- Score médio: ${stats.totalScoreAverage} pts (de 100)
- Arrobas totais: ${stats.totalArrobas} @
- Valor estimado da base: ${stats.estimatedValue}
- Propriedades ativas: ${stats.totalProperties}
- Animal de maior score: ${stats.topAnimal ? `${stats.topAnimal.code} com ${stats.topAnimal.score} pts` : "—"}

INDICADORES OPERACIONAIS (próximos 7-30 dias):
- Carências sanitárias expirando em 7 dias: ${stats.withdrawals7d}
- Animais sem pesagem há +30 dias: ${stats.noPesagem30d}
- Lotes com embarque próximo: ${stats.lotsUpcoming}
- Embarques parados (>5 dias sem atualização): ${stats.shipmentsStale}
- Certificações expiradas: ${stats.expiredCertsCount}
- Alertas ativos totais: ${stats.totalActiveAlerts}
`.trim();

  let response: Awaited<ReturnType<typeof anthropic.messages.create>>;
  try {
    response = await anthropic.messages.create(
      {
        model: "claude-sonnet-4-5",
        max_tokens: 400,
        system: contexto,
        messages: [{
          role: "user",
          content: "Gere 3 insights executivos sobre o estado atual do rebanho. Use a ferramenta painel_insights.",
        }],
        tools: [{
          name: "painel_insights",
          description: "Retorna 3 insights executivos sobre o estado atual do rebanho",
          input_schema: {
            type: "object" as const,
            properties: {
              destaque: {
                type: "string",
                description: "1 frase apontando o ponto positivo principal usando números reais do contexto (ex.: 'Score médio de 78 pts coloca o rebanho na faixa de excelência operacional.'). Máximo 22 palavras.",
              },
              risco: {
                type: "string",
                description: "1 frase apontando o risco operacional mais relevante baseado nos indicadores (carências, sem pesagem, embarques parados, certificações expiradas). Máximo 22 palavras.",
              },
              acao: {
                type: "string",
                description: "1 frase com ação concreta sugerida que deriva diretamente do risco apontado. Verbo no infinitivo ou imperativo. Máximo 18 palavras.",
              },
            },
            required: ["destaque", "risco", "acao"],
          },
        }],
        tool_choice: { type: "any" },
      },
      { signal: AbortSignal.timeout(12_000) },
    );
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return Response.json({ error: "Insights indisponíveis (timeout)" }, { status: 504 });
    }
    return Response.json({ error: "Insights indisponíveis" }, { status: 502 });
  }

  const toolUse = response.content.find(c => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return Response.json({ error: "Insights indisponíveis" }, { status: 500 });
  }

  return Response.json({ ok: true, insights: toolUse.input });
}
