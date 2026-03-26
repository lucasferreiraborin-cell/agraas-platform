import { createSupabaseServerClient } from "@/lib/supabase-server";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

// ── pdf-parse: importa do lib direto para evitar bug do Next.js com arquivo de teste
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Helpers XML ───────────────────────────────────────────────────────────────

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

// ── Tipos internos ────────────────────────────────────────────────────────────

type ParsedHeader = {
  numeroNota:   string;
  serie:        string;
  emitenteCnpj: string;
  emitenteNome: string;
  dataEmissao:  string;
  valorTotal:   number;
  rawContent:   string;
};

type ParsedItem = {
  descricao:     string;
  ncm:           string;
  cfop:          string;
  quantidade:    number;
  unidade:       string;
  valorUnitario: number;
  valorTotal:    number;
  icmsAliq:      number;
  icmsValor:     number;
  ipiValor:      number;
};

// ── Parser XML ────────────────────────────────────────────────────────────────

function parseXml(xml: string): { header: ParsedHeader; items: ParsedItem[] } {
  const header: ParsedHeader = {
    numeroNota:   extractTag(xml, "nNF"),
    serie:        extractTag(xml, "serie"),
    emitenteCnpj: extractTag(xml, "CNPJ"),
    emitenteNome: extractTag(xml, "xNome") || extractTag(xml, "xFant"),
    dataEmissao:  (extractTag(xml, "dhEmi") || extractTag(xml, "dEmi")).slice(0, 10),
    valorTotal:   parseFloat(extractTag(xml, "vNF") || "0"),
    rawContent:   xml,
  };

  const items: ParsedItem[] = extractBlock(xml, "det").map((det) => ({
    descricao:     extractTag(det, "xProd"),
    ncm:           extractTag(det, "NCM"),
    cfop:          extractTag(det, "CFOP"),
    quantidade:    parseFloat(extractTag(det, "qCom")   || "0"),
    unidade:       extractTag(det, "uCom"),
    valorUnitario: parseFloat(extractTag(det, "vUnCom") || "0"),
    valorTotal:    parseFloat(extractTag(det, "vProd")  || "0"),
    icmsAliq:      parseFloat(extractTag(det, "pICMS")  || "0"),
    icmsValor:     parseFloat(extractTag(det, "vICMS")  || "0"),
    ipiValor:      parseFloat(extractTag(det, "vIPI")   || "0"),
  }));

  return { header, items };
}

// ── Parser PDF via Claude ─────────────────────────────────────────────────────

async function parsePdf(buffer: Buffer): Promise<{ header: ParsedHeader; items: ParsedItem[] }> {
  const pdfData = await pdfParse(buffer);
  const text = pdfData.text as string;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: `Você é um especialista em NF-e brasileira. Extraia os dados estruturados do texto de uma nota fiscal.
Responda SOMENTE com JSON válido neste formato exato, sem markdown, sem explicações:
{
  "numero_nota": "string",
  "serie": "string",
  "emitente_cnpj": "string (somente dígitos)",
  "emitente_nome": "string",
  "data_emissao": "YYYY-MM-DD",
  "valor_total": number,
  "itens": [
    {
      "descricao": "string",
      "ncm": "string (8 dígitos)",
      "cfop": "string (4 dígitos)",
      "quantidade": number,
      "unidade": "string",
      "valor_unitario": number,
      "valor_total": number,
      "icms_aliquota": number,
      "icms_valor": number,
      "ipi_valor": number
    }
  ]
}
Se um campo não existir no texto, use "" para strings e 0 para números.`,
    messages: [{ role: "user", content: `Extraia os dados desta NF-e:\n\n${text.slice(0, 12000)}` }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

  const header: ParsedHeader = {
    numeroNota:   String(parsed.numero_nota   ?? "S/N"),
    serie:        String(parsed.serie         ?? "-"),
    emitenteCnpj: String(parsed.emitente_cnpj ?? ""),
    emitenteNome: String(parsed.emitente_nome ?? ""),
    dataEmissao:  String(parsed.data_emissao  ?? ""),
    valorTotal:   Number(parsed.valor_total   ?? 0),
    rawContent:   text,
  };

  const items: ParsedItem[] = (parsed.itens ?? []).map((it: Record<string, unknown>) => ({
    descricao:     String(it.descricao     ?? ""),
    ncm:           String(it.ncm           ?? ""),
    cfop:          String(it.cfop          ?? ""),
    quantidade:    Number(it.quantidade    ?? 0),
    unidade:       String(it.unidade       ?? ""),
    valorUnitario: Number(it.valor_unitario ?? 0),
    valorTotal:    Number(it.valor_total   ?? 0),
    icmsAliq:      Number(it.icms_aliquota ?? 0),
    icmsValor:     Number(it.icms_valor    ?? 0),
    ipiValor:      Number(it.ipi_valor     ?? 0),
  }));

  return { header, items };
}

// ── Save ao banco + geração de alertas ───────────────────────────────────────

async function saveNote(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  clientId: string,
  header: ParsedHeader,
  items: ParsedItem[],
) {
  const { data: noteData, error: noteError } = await supabase
    .from("fiscal_notes")
    .insert({
      client_id:     clientId,
      xml_content:   header.rawContent,
      numero_nota:   header.numeroNota || "S/N",
      serie:         header.serie      || "-",
      emitente_cnpj: header.emitenteCnpj,
      emitente_nome: header.emitenteNome,
      data_emissao:  header.dataEmissao || null,
      valor_total:   header.valorTotal  || null,
      status:        "pendente",
    })
    .select("id")
    .single();

  if (noteError || !noteData) throw new Error("Erro ao salvar nota: " + noteError?.message);

  const noteId = noteData.id;
  const alerts: { note_id: string; client_id: string; tipo: string; descricao: string; severidade: string }[] = [];

  const dbItems = items.map((it) => {
    if (!/^\d{8}$/.test(it.ncm)) {
      alerts.push({ note_id: noteId, client_id: clientId, tipo: "ncm_incorreto",
        descricao: `Item "${it.descricao}": NCM "${it.ncm}" deve ter 8 dígitos numéricos.`, severidade: "critico" });
    }
    if (it.cfop && !/^[1-37]/.test(it.cfop)) {
      alerts.push({ note_id: noteId, client_id: clientId, tipo: "cfop_divergente",
        descricao: `Item "${it.descricao}": CFOP "${it.cfop}" não é válido para operação fiscal.`, severidade: "critico" });
    }
    if (!it.descricao) {
      alerts.push({ note_id: noteId, client_id: clientId, tipo: "item_incompleto",
        descricao: "Item sem descrição encontrado na nota.", severidade: "info" });
    }
    return {
      note_id: noteId, client_id: clientId,
      descricao: it.descricao, ncm: it.ncm, cfop: it.cfop,
      quantidade: it.quantidade, unidade: it.unidade,
      valor_unitario: it.valorUnitario, valor_total: it.valorTotal,
      icms_aliquota: it.icmsAliq, icms_valor: it.icmsValor, ipi_valor: it.ipiValor,
    };
  });

  const somaItens = items.reduce((s, i) => s + i.valorTotal, 0);
  if (header.valorTotal > 0 && Math.abs(header.valorTotal - somaItens) > 0.02) {
    alerts.push({ note_id: noteId, client_id: clientId, tipo: "valor_divergente",
      descricao: `Valor da nota (R$${header.valorTotal.toFixed(2)}) difere da soma dos itens (R$${somaItens.toFixed(2)}).`,
      severidade: "aviso" });
  }

  if (dbItems.length > 0) await supabase.from("fiscal_note_items").insert(dbItems);
  if (alerts.length  > 0) await supabase.from("fiscal_alerts").insert(alerts);

  const hasCritical = alerts.some(a => a.severidade === "critico");
  if (hasCritical) await supabase.from("fiscal_notes").update({ status: "erro" }).eq("id", noteId);

  return { noteId, alerts, hasCritical };
}

// ── Handler principal ─────────────────────────────────────────────────────────

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
    if (!file) return Response.json({ error: "Arquivo não enviado" }, { status: 400 });

    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    const isXml = file.name.toLowerCase().endsWith(".xml");
    if (!isPdf && !isXml) {
      return Response.json({ error: "Formato não suportado. Envie .xml ou .pdf" }, { status: 400 });
    }

    let header: ParsedHeader;
    let items:  ParsedItem[];

    if (isPdf) {
      const buffer = Buffer.from(await file.arrayBuffer());
      ({ header, items } = await parsePdf(buffer));
    } else {
      const xml = await file.text();
      ({ header, items } = parseXml(xml));
    }

    const { noteId, alerts, hasCritical } = await saveNote(supabase, clientData.id, header, items);

    return Response.json({
      note_id:      noteId,
      numero_nota:  header.numeroNota,
      total_items:  items.length,
      alerts_count: alerts.length,
      status:       hasCritical ? "erro" : "pendente",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
