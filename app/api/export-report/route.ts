import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SCORE_MINIMO = 60;

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 100, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const { lotId } = await req.json();
  if (!lotId) return new Response("lotId obrigatório", { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Não autenticado", { status: 401 });

  // Busca dados do lote
  const { data: lot } = await supabase.from("lots")
    .select("id, name, objective, pais_destino, porto_embarque, data_embarque, certificacoes_exigidas, numero_contrato, target_weight")
    .eq("id", lotId).single();

  if (!lot) return new Response("Lote não encontrado", { status: 404 });

  // Animais do lote
  const { data: assignments } = await supabase
    .from("animal_lot_assignments")
    .select("animal_id, animals(id, internal_code, nickname, sex, breed, birth_date, blood_type, sire_animal_id, dam_animal_id)")
    .eq("lot_id", lotId).is("exit_date", null);

  const animals = ((assignments ?? []) as any[])
    .filter(a => a.animals)
    .map(a => ({ ...a.animals, assignment_id: a.id }));

  const animalIds = animals.map((a: any) => a.id);

  if (animalIds.length === 0) {
    return Response.json({ ok: false, error: "Lote sem animais" }, { status: 400 });
  }

  // Pesos, carências e certificações
  const [{ data: weights }, { data: applications }, { data: certifications }, { data: passportCache }] = await Promise.all([
    supabase.from("weights").select("animal_id, weight, weighing_date")
      .in("animal_id", animalIds).order("weighing_date", { ascending: false }),
    supabase.from("applications").select("animal_id, withdrawal_date, product_name")
      .in("animal_id", animalIds),
    supabase.from("animal_certifications").select("animal_id, certification_name, status, expires_at")
      .in("animal_id", animalIds),
    supabase.from("agraas_master_passport_cache").select("animal_id, score_json")
      .in("animal_id", animalIds),
  ]);

  const today = new Date();

  // Índices
  const lastWeightMap = new Map<string, number>();
  for (const w of (weights ?? [])) {
    if (!lastWeightMap.has(w.animal_id)) lastWeightMap.set(w.animal_id, Number(w.weight));
  }

  const activeCarencias = new Map<string, string[]>();
  for (const a of (applications ?? [])) {
    if (a.withdrawal_date && new Date(a.withdrawal_date) > today) {
      const list = activeCarencias.get(a.animal_id) ?? [];
      list.push(a.product_name ?? "produto");
      activeCarencias.set(a.animal_id, list);
    }
  }

  const certsByAnimal = new Map<string, string[]>();
  for (const c of (certifications ?? [])) {
    if (c.status === "active" && (!c.expires_at || new Date(c.expires_at) > today)) {
      const list = certsByAnimal.get(c.animal_id) ?? [];
      list.push(c.certification_name);
      certsByAnimal.set(c.animal_id, list);
    }
  }

  const scoreMap = new Map<string, number>();
  for (const p of (passportCache ?? [])) {
    scoreMap.set(p.animal_id, p.score_json?.total_score ?? 0);
  }

  const certRequired: string[] = (lot.certificacoes_exigidas as string[]) ?? [];

  // Calcula aptidão por animal
  const animalReport = animals.map((animal: any) => {
    const score = scoreMap.get(animal.id) ?? 0;
    const carencias = activeCarencias.get(animal.id) ?? [];
    const certs = certsByAnimal.get(animal.id) ?? [];
    const certsFaltando = certRequired.filter(c => !certs.includes(c));
    const peso = lastWeightMap.get(animal.id);

    const pendencias: string[] = [];
    if (score < SCORE_MINIMO) pendencias.push(`Score ${score} abaixo do mínimo (${SCORE_MINIMO})`);
    if (carencias.length > 0) pendencias.push(`Carência ativa: ${carencias.join(", ")}`);
    if (certsFaltando.length > 0) pendencias.push(`Certificações faltando: ${certsFaltando.join(", ")}`);

    const status = pendencias.length === 0 ? "apto" : score < SCORE_MINIMO || carencias.length > 0 ? "inapto" : "pendencias";

    return {
      id: animal.id,
      nome: animal.nickname ?? animal.internal_code ?? animal.id.slice(0, 8),
      sex: animal.sex,
      breed: animal.breed ?? "N/D",
      score,
      peso: peso ? `${peso} kg` : "sem pesagem",
      status,
      pendencias,
      certs,
    };
  });

  const aptos = animalReport.filter(a => a.status === "apto").length;
  const inaptos = animalReport.filter(a => a.status === "inapto").length;
  const pendencias = animalReport.filter(a => a.status === "pendencias").length;
  const conformidadePct = Math.round((aptos / animals.length) * 100);

  const hoje = today.toLocaleDateString("pt-BR");
  const contexto = `
Você é um especialista em rastreabilidade de exportação bovina para o Oriente Médio.
Gere um relatório de conformidade para o seguinte lote de exportação.

LOTE: ${lot.name}
País destino: ${lot.pais_destino ?? "N/D"}
Porto: ${lot.porto_embarque ?? "N/D"}
Embarque previsto: ${lot.data_embarque ? new Date(lot.data_embarque).toLocaleDateString("pt-BR") : "N/D"}
Contrato: ${lot.numero_contrato ?? "N/D"}
Certificações exigidas: ${certRequired.join(", ") || "não especificadas"}
Data do relatório: ${hoje}

RESULTADO DA ANÁLISE (${animals.length} animais):
- Aptos para exportação: ${aptos} (${conformidadePct}%)
- Com pendências sanáveis: ${pendencias}
- Inaptos: ${inaptos}

ANIMAIS COM PENDÊNCIAS OU INAPTOS:
${animalReport.filter(a => a.status !== "apto").map(a =>
  `- ${a.nome} | Score: ${a.score} | ${a.pendencias.join("; ")}`
).join("\n") || "Nenhum — todos aptos"}
`.trim();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: contexto,
    messages: [{ role: "user", content: "Gere o relatório de conformidade completo em português e inglês." }],
    tools: [{
      name: "relatorio_conformidade",
      description: "Relatório estruturado de conformidade do lote de exportação",
      input_schema: {
        type: "object" as const,
        properties: {
          parecer_geral_pt: { type: "string", description: "Parecer executivo em português (3-4 frases)" },
          parecer_geral_en: { type: "string", description: "Executive summary in English (3-4 sentences)" },
          recomendacao_pt: { type: "string", description: "Recomendação principal de ação em português" },
          recomendacao_en: { type: "string", description: "Main action recommendation in English" },
          documentos_necessarios: {
            type: "array",
            items: { type: "string" },
            description: "Lista de documentos necessários para exportação para o destino indicado",
          },
          prazo_regularizacao: { type: "string", description: "Prazo estimado para regularizar pendências" },
          nivel_risco: { type: "string", enum: ["Baixo", "Médio", "Alto"], description: "Nível de risco do embarque" },
        },
        required: ["parecer_geral_pt", "parecer_geral_en", "recomendacao_pt", "recomendacao_en", "documentos_necessarios", "prazo_regularizacao", "nivel_risco"],
      },
    }],
    tool_choice: { type: "any" },
  });

  const toolUse = response.content.find(c => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return Response.json({ ok: false, error: "Relatório indisponível" }, { status: 500 });
  }

  return Response.json({
    ok: true,
    relatorio: toolUse.input,
    resumo: { aptos, inaptos, pendencias, conformidadePct, total: animals.length },
    animais: animalReport,
    lote: { nome: lot.name, pais_destino: lot.pais_destino, porto_embarque: lot.porto_embarque, data_embarque: lot.data_embarque, numero_contrato: lot.numero_contrato, certificacoes_exigidas: certRequired },
    gerado_em: hoje,
  });
}
