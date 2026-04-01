import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

// ── Helpers XML (idênticos ao /api/fiscal/parse-xml) ─────────────────────────

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

type ParsedHeader = {
  numeroNota:   string;
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
};

function parseXml(xml: string): { header: ParsedHeader; items: ParsedItem[] } {
  const header: ParsedHeader = {
    numeroNota:   extractTag(xml, "nNF"),
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
  }));
  return { header, items };
}

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

function parsePdfText(text: string, rawBuffer: Buffer): { header: ParsedHeader; items: ParsedItem[]; iaFailed: boolean } {
  const cnpj   = text.match(/(\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2})/)?.[1]?.replace(/\D/g, "") ?? "";
  const numero = text.match(/N[º°ú]\s*[:\s]?\s*(\d{6,9})/i)?.[1] ?? "";
  const data   = text.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1]?.split("/").reverse().join("-") ?? "";
  const valor  = parseFloat(
    text.match(/[Vv]alor\s*[Tt]otal\s*[:\s]?\s*R?\$?\s*([\d.,]+)/)?.[1]
      ?.replace(/\./g, "").replace(",", ".") ?? "0"
  );
  const lines   = text.split("\n").map(l => l.trim()).filter(Boolean);
  const cnpjIdx = lines.findIndex(l => l.replace(/\D/g, "").includes(cnpj.slice(0, 8)));
  const nome    = cnpjIdx > 0 ? lines[cnpjIdx - 1] : "";
  return {
    header: {
      numeroNota:   numero || "PDF importado",
      emitenteCnpj: cnpj,
      emitenteNome: nome,
      dataEmissao:  data,
      valorTotal:   valor,
      rawContent:   rawBuffer.toString("base64").slice(0, 500) + "…[PDF]",
    },
    items: [],
    iaFailed: !numero && !cnpj && !valor,
  };
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 20, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  try {
    const supabase = await createSupabaseServerClient();

    const [{ data: { user } }, formData] = await Promise.all([
      supabase.auth.getUser(),
      req.formData(),
    ]);
    if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });

    const file   = formData.get("xml") as File | null;
    const farmId = formData.get("farm_id") as string | null;
    if (!file)   return Response.json({ error: "Arquivo não enviado" }, { status: 400 });

    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    const isXml = file.name.toLowerCase().endsWith(".xml");
    if (!isPdf && !isXml) {
      return Response.json({ error: "Formato não suportado. Envie .xml ou .pdf" }, { status: 400 });
    }

    const [clientResult, parsed] = await Promise.all([
      supabase.from("clients").select("id").eq("auth_user_id", user.id).single(),
      isPdf
        ? file.arrayBuffer().then(buf => {
            const buffer = Buffer.from(buf);
            return parsePdfText(extractPdfText(buffer), buffer);
          })
        : file.text().then(xml => ({ ...parseXml(xml), iaFailed: false })),
    ]);

    const clientData = clientResult.data;
    if (!clientData) return Response.json({ error: "Cliente não encontrado" }, { status: 404 });

    const { header, items, iaFailed } = parsed as { header: ParsedHeader; items: ParsedItem[]; iaFailed: boolean };

    // Salva nota agrícola
    const { data: noteData, error: noteError } = await supabase
      .from("crop_fiscal_notes")
      .insert({
        client_id:     clientData.id,
        farm_id:       farmId || null,
        xml_content:   header.rawContent,
        numero_nota:   header.numeroNota || "S/N",
        emitente_cnpj: header.emitenteCnpj,
        emitente_nome: header.emitenteNome,
        data_emissao:  header.dataEmissao || null,
        valor_total:   header.valorTotal  || null,
        status:        "pendente",
      })
      .select("id")
      .single();

    if (noteError || !noteData) throw new Error("Erro ao salvar nota: " + noteError?.message);

    // Salva itens
    const alerts: string[] = [];
    if (iaFailed) alerts.push("PDF importado sem extração completa — verifique os campos manualmente.");

    const dbItems = items.map(it => ({
      note_id:       noteData.id,
      client_id:     clientData.id,
      descricao:     it.descricao,
      ncm:           it.ncm,
      cfop:          it.cfop,
      quantidade:    it.quantidade,
      unidade:       it.unidade,
      valor_unitario: it.valorUnitario,
      valor_total:   it.valorTotal,
      icms_aliquota: it.icmsAliq,
    }));

    if (dbItems.length > 0) {
      await supabase.from("crop_fiscal_note_items").insert(dbItems);
    }

    // Valida: marca como erro se NCM inválido
    const hasInvalidNcm = items.some(it => it.ncm && !/^\d{8}$/.test(it.ncm));
    if (hasInvalidNcm || (iaFailed && !header.numeroNota)) {
      await supabase.from("crop_fiscal_notes").update({ status: "erro" }).eq("id", noteData.id);
    }

    return Response.json({
      note_id:      noteData.id,
      numero_nota:  header.numeroNota,
      total_items:  items.length,
      alerts,
      status:       hasInvalidNcm ? "erro" : "pendente",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
