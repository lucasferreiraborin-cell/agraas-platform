import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 100, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });

    const { note_id } = await req.json();

    const { data: note } = await supabase
      .from("fiscal_notes")
      .select("numero_nota, emitente_nome, valor_total, data_emissao")
      .eq("id", note_id).single();

    const { data: items } = await supabase
      .from("fiscal_note_items")
      .select("descricao, ncm, cfop, quantidade, unidade, valor_total, icms_aliquota")
      .eq("note_id", note_id);

    const itemsText = (items ?? []).map((it: any, i: number) =>
      `${i + 1}. ${it.descricao} | NCM: ${it.ncm} | CFOP: ${it.cfop} | Qtd: ${it.quantidade} ${it.unidade} | Valor: R$${Number(it.valor_total).toFixed(2)} | ICMS: ${it.icms_aliquota}%`
    ).join("\n");

    const systemPrompt = `Você é um especialista em legislação fiscal agropecuária brasileira. Analise notas fiscais de fazendas e identifique:
1. NCMs incorretos para insumos agropecuários (medicamentos veterinários: 3002/3004/3808, rações: 2309, vacinas: 3002, equipamentos: 8432-8436, sementes: 1209)
2. CFOPs inadequados (entrada de mercadoria: 1xxx/2xxx, remessa: 5xxx/6xxx, devolução: 3xxx/7xxx)
3. Riscos de autuação (ICMS sobre insumos agro - Lei Kandir garante isenção em muitos casos)
4. Inconsistências entre descrição e NCM
Responda SEMPRE em JSON com esta estrutura: {"risks": [{"item": string, "descricao": string, "severidade": "baixo"|"medio"|"alto"}], "suggestions": [string], "overall_risk": "baixo"|"medio"|"alto", "resumo": string}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: `NF-e nº ${note?.numero_nota} | Emitente: ${note?.emitente_nome} | Valor total: R$${Number(note?.valor_total ?? 0).toFixed(2)}\n\nItens:\n${itemsText}\n\nAnalise esta nota fiscal agropecuária.` }],
    }, { signal: AbortSignal.timeout(10_000) });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    let analysis: any = {};
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { risks: [], suggestions: [], overall_risk: "baixo", resumo: text };
    } catch {
      analysis = { risks: [], suggestions: [], overall_risk: "baixo", resumo: text };
    }

    // Salva alertas de IA no banco
    const { data: clientData } = await supabase.from("clients").select("id").eq("auth_user_id", user.id).single();
    if (clientData && analysis.risks?.length > 0) {
      const iaAlerts = analysis.risks.map((r: any) => ({
        note_id: note_id,
        client_id: clientData.id,
        tipo: "ia_fiscal",
        descricao: `[IA] ${r.item ? r.item + ": " : ""}${r.descricao}`,
        severidade: r.severidade === "alto" ? "critico" : r.severidade === "medio" ? "aviso" : "info",
      }));
      await supabase.from("fiscal_alerts").insert(iaAlerts);
    }

    return Response.json(analysis);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
