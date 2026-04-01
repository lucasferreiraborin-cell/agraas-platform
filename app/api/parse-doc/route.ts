import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

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

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type ParsedDocHeader = {
  numero_nota:       string;
  emitente_cnpj:     string;
  emitente_nome:     string;
  data_emissao:      string;
  valor_total:       number;
  destinatario_nome: string;
  destinatario_cnpj: string;
};

export type ParsedDocItem = {
  descricao:     string;
  quantidade:    number;
  unidade:       string;
  valor_unitario: number;
  valor_total:   number;
};

export type ParseDocResponse = {
  header: ParsedDocHeader;
  items:  ParsedDocItem[];
  ia_failed?: boolean;
};

// ── Parser XML ────────────────────────────────────────────────────────────────

function parseXml(xml: string): ParseDocResponse {
  // Para destinatário, o segundo xNome no XML é o destinatário
  const xNomeMatches = xml.match(/<xNome[^>]*>([\s\S]*?)<\/xNome>/gi) ?? [];
  const cnpjMatches  = xml.match(/<CNPJ[^>]*>([\s\S]*?)<\/CNPJ>/gi) ?? [];

  const header: ParsedDocHeader = {
    numero_nota:       extractTag(xml, "nNF"),
    emitente_cnpj:     cnpjMatches[0]  ? cnpjMatches[0].replace(/<[^>]+>/g, "").trim() : "",
    emitente_nome:     xNomeMatches[0] ? xNomeMatches[0].replace(/<[^>]+>/g, "").trim() : extractTag(xml, "xFant"),
    data_emissao:      (extractTag(xml, "dhEmi") || extractTag(xml, "dEmi")).slice(0, 10),
    valor_total:       parseFloat(extractTag(xml, "vNF") || "0"),
    destinatario_nome: xNomeMatches[1] ? xNomeMatches[1].replace(/<[^>]+>/g, "").trim() : "",
    destinatario_cnpj: cnpjMatches[1]  ? cnpjMatches[1].replace(/<[^>]+>/g, "").trim() : "",
  };

  const items: ParsedDocItem[] = extractBlock(xml, "det").map((det) => ({
    descricao:      extractTag(det, "xProd"),
    quantidade:     parseFloat(extractTag(det, "qCom")   || "0"),
    unidade:        extractTag(det, "uCom"),
    valor_unitario: parseFloat(extractTag(det, "vUnCom") || "0"),
    valor_total:    parseFloat(extractTag(det, "vProd")  || "0"),
  }));

  return { header, items };
}

// ── Parser PDF ────────────────────────────────────────────────────────────────

function extractPdfText(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const textBlocks: string[] = [];
  const btEt = /BT([\s\S]*?)ET/g;
  let m;
  while ((m = btEt.exec(raw)) !== null) {
    const strings = m[1].match(/\(([^)]*)\)/g) ?? [];
    const line = strings.map(s => s.slice(1, -1)).join(" ").trim();
    if (line) textBlocks.push(line);
  }
  return textBlocks.join("\n");
}

function parsePdfText(text: string): ParseDocResponse {
  const cnpj   = text.match(/(\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2})/)?.[1]?.replace(/\D/g, "") ?? "";
  const numero = text.match(/N[º°ú]\s*[:\s]?\s*(\d{6,9})/i)?.[1] ?? "";
  const data   = text.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1]?.split("/").reverse().join("-") ?? "";
  const valor  = parseFloat(
    text.match(/[Vv]alor\s*[Tt]otal\s*[:\s]?\s*R?\$?\s*([\d.,]+)/)?.[1]
      ?.replace(/\./g, "").replace(",", ".") ?? "0"
  );
  const lines    = text.split("\n").map(l => l.trim()).filter(Boolean);
  const cnpjIdx  = lines.findIndex(l => l.replace(/\D/g, "").includes(cnpj.slice(0, 8)));
  const nome     = cnpjIdx > 0 ? lines[cnpjIdx - 1] : "";
  const iaFailed = !numero && !cnpj && !valor;

  return {
    header: {
      numero_nota:       numero || "PDF importado",
      emitente_cnpj:     cnpj,
      emitente_nome:     nome,
      data_emissao:      data,
      valor_total:       valor,
      destinatario_nome: "",
      destinatario_cnpj: "",
    },
    items:     [],
    ia_failed: iaFailed,
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 30, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  try {
    const supabase = await createSupabaseServerClient();
    const [{ data: { user } }, formData] = await Promise.all([
      supabase.auth.getUser(),
      req.formData(),
    ]);
    if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });

    const file = formData.get("xml") as File | null;
    if (!file) return Response.json({ error: "Arquivo não enviado" }, { status: 400 });

    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    const isXml = file.name.toLowerCase().endsWith(".xml");
    if (!isPdf && !isXml) {
      return Response.json({ error: "Formato não suportado. Envie .xml ou .pdf" }, { status: 400 });
    }

    const result: ParseDocResponse = isPdf
      ? await file.arrayBuffer().then(buf => parsePdfText(extractPdfText(Buffer.from(buf))))
      : await file.text().then(xml => parseXml(xml));

    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
