import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";

function extractTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? m[1].trim() : "";
}

function extractBlock(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[\\s\\S]*?>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const results: string[] = [];
  let m;
  while ((m = re.exec(xml)) !== null) results.push(m[0]);
  return results;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Não autenticado", { status: 401 });

    const { data: clientData } = await supabase
      .from("clients").select("id").eq("auth_user_id", user.id).single();
    if (!clientData) return new Response("Cliente não encontrado", { status: 404 });

    const formData = await req.formData();
    const file = formData.get("xml") as File | null;
    if (!file) return Response.json({ error: "XML não enviado" }, { status: 400 });

    const xml = await file.text();

    // Extrai cabeçalho
    const numeroNota   = extractTag(xml, "nNF");
    const serie        = extractTag(xml, "serie");
    const dataEmissao  = extractTag(xml, "dhEmi") || extractTag(xml, "dEmi");
    const valorTotal   = extractTag(xml, "vNF");
    const emitenteCnpj = extractTag(xml, "CNPJ");
    const emitenteNome = extractTag(xml, "xNome") || extractTag(xml, "xFant");

    // Insere nota
    const { data: noteData, error: noteError } = await supabase
      .from("fiscal_notes")
      .insert({
        client_id:     clientData.id,
        xml_content:   xml,
        numero_nota:   numeroNota || "S/N",
        serie:         serie || "-",
        emitente_cnpj: emitenteCnpj,
        emitente_nome: emitenteNome,
        data_emissao:  dataEmissao ? dataEmissao.slice(0, 10) : null,
        valor_total:   valorTotal ? parseFloat(valorTotal) : null,
        status:        "pendente",
      })
      .select("id")
      .single();

    if (noteError || !noteData) {
      return Response.json({ error: "Erro ao salvar nota: " + noteError?.message }, { status: 500 });
    }

    const noteId = noteData.id;
    const alerts: { note_id: string; client_id: string; tipo: string; descricao: string; severidade: string }[] = [];

    // Extrai itens (blocos <det>)
    const detBlocks = extractBlock(xml, "det");
    const items = detBlocks.map((det) => {
      const descricao     = extractTag(det, "xProd");
      const ncm           = extractTag(det, "NCM");
      const cfop          = extractTag(det, "CFOP");
      const quantidade    = parseFloat(extractTag(det, "qCom") || "0");
      const unidade       = extractTag(det, "uCom");
      const valorUnitario = parseFloat(extractTag(det, "vUnCom") || "0");
      const valorTotalItem = parseFloat(extractTag(det, "vProd") || "0");
      const icmsAliq      = parseFloat(extractTag(det, "pICMS") || "0");
      const icmsValor     = parseFloat(extractTag(det, "vICMS") || "0");
      const ipiValor      = parseFloat(extractTag(det, "vIPI") || "0");

      // Validações
      if (!/^\d{8}$/.test(ncm)) {
        alerts.push({
          note_id: noteId, client_id: clientData.id,
          tipo: "ncm_incorreto",
          descricao: `Item "${descricao}": NCM "${ncm}" deve ter 8 dígitos numéricos.`,
          severidade: "critico",
        });
      }
      if (cfop && !/^[1-37]/.test(cfop)) {
        alerts.push({
          note_id: noteId, client_id: clientData.id,
          tipo: "cfop_divergente",
          descricao: `Item "${descricao}": CFOP "${cfop}" não é válido para operação fiscal.`,
          severidade: "critico",
        });
      }
      if (!descricao) {
        alerts.push({
          note_id: noteId, client_id: clientData.id,
          tipo: "item_incompleto",
          descricao: `Item sem descrição encontrado na nota.`,
          severidade: "info",
        });
      }

      return { note_id: noteId, client_id: clientData.id, descricao, ncm, cfop, quantidade, unidade, valor_unitario: valorUnitario, valor_total: valorTotalItem, icms_aliquota: icmsAliq, icms_valor: icmsValor, ipi_valor: ipiValor };
    });

    // Valida valor total
    const somaItens = items.reduce((s, i) => s + (i.valor_total || 0), 0);
    const vNF = valorTotal ? parseFloat(valorTotal) : 0;
    if (vNF > 0 && Math.abs(vNF - somaItens) > 0.02) {
      alerts.push({
        note_id: noteId, client_id: clientData.id,
        tipo: "valor_divergente",
        descricao: `Valor da nota (R$${vNF.toFixed(2)}) difere da soma dos itens (R$${somaItens.toFixed(2)}).`,
        severidade: "aviso",
      });
    }

    if (items.length > 0) await supabase.from("fiscal_note_items").insert(items);
    if (alerts.length > 0) await supabase.from("fiscal_alerts").insert(alerts);

    const hasCritical = alerts.some(a => a.severidade === "critico");
    if (hasCritical) {
      await supabase.from("fiscal_notes").update({ status: "erro" }).eq("id", noteId);
    }

    return Response.json({
      note_id:      noteId,
      numero_nota:  numeroNota,
      total_items:  items.length,
      alerts_count: alerts.length,
      status:       hasCritical ? "erro" : "pendente",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
