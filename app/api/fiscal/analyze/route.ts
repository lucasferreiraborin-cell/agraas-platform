import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { writeCanonicalAlerts } from "@/lib/fiscal/alert-writer";
import { FISCAL_WRITES_CANONICAL, FISCAL_WRITES_LEGACY } from "@/lib/feature-flags";

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

    // F6 (raio-x 14/09): o prompt afirmava "Lei Kandir garante isenção" e
    // listava NCM 3808 (defensivos) como medicamento — norma sem fonte e
    // classificação errada, contradizendo rules/icms/R-ICMS-CONV100-01.yaml.
    // A IA aponta INDÍCIO; quem afirma benefício é o contador, com a regra.
    const systemPrompt = `Você é um analista fiscal agropecuário brasileiro. Analise a nota fiscal e aponte INDÍCIOS — nunca conclusões normativas.
1. NCM que não combina com a descrição do item. Referências usuais: medicamentos veterinários 3004; vacinas 3002; defensivos/inseticidas/fungicidas/herbicidas 3808; rações e suplementos 2309; sal 2501; sementes 1209; máquinas agrícolas 8432-8436.
2. CFOP inconsistente com a operação: no XML, o CFOP é do ponto de vista do EMITENTE — 1xxx/2xxx entradas, 5xxx/6xxx saídas (interna/interestadual), 3xxx/7xxx exterior. Uma compra do produtor normalmente chega com 5xxx/6xxx do fornecedor; isso NÃO é erro.
3. Indícios de benefício fiscal de ICMS em insumos (redução de base, isenção). NÃO afirme que existe isenção, direito ou valor a recuperar: o benefício depende do Convênio ICMS 100/97 e da legislação do estado e é confirmado pelo contador. Escreva "verificar com o contador" e use severidade no máximo "medio".
4. Inconsistências internas (quantidade × unitário ≠ total, item sem descrição).
Nunca cite lei, artigo ou número de convênio que você não tenha certeza. Responda SEMPRE em JSON com esta estrutura: {"risks": [{"item": string, "descricao": string, "severidade": "baixo"|"medio"|"alto"}], "suggestions": [string], "overall_risk": "baixo"|"medio"|"alto", "resumo": string}`;

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
      // Esta rota trabalha no modelo legado (fiscal_notes / fiscal_note_items); os
      // alertas em PT (note_id/tipo/descricao/severidade) casam com fiscal_notes_alerts_legacy.
      // fiscal_alerts (novo, colunas em inglês, FK fiscal_invoice_id) rejeitava o payload
      // e os alertas de IA NUNCA eram gravados — falha silenciosa do supabase-js.
      if (FISCAL_WRITES_LEGACY) {
        const { error: alertErr } = await supabase.from("fiscal_notes_alerts_legacy").insert(iaAlerts);
        if (alertErr) console.error("[fiscal/analyze] falha ao salvar alertas IA:", alertErr.message);
      }
      // B0c: canal canonico. A nota ja existe na canonica quando o modo permite,
      // entao a FK fiscal_invoice_id esta satisfeita.
      if (FISCAL_WRITES_CANONICAL) {
        const al = await writeCanonicalAlerts(supabase, iaAlerts, true);
        if (!al.ok) console.error("[fiscal/analyze] alertas IA canonicos:", al.error);
      }
    }

    return Response.json(analysis);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
