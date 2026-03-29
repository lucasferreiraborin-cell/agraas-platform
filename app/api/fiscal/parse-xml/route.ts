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

// ── Parser PDF — leitura como texto bruto + regex ─────────────────────────────
// pdf-parse usa DOMMatrix (API de browser) que não existe no Node.js serverless.
// Alternativa: Buffer.toString('latin1') extrai texto embutido de PDFs simples.

function extractPdfText(buffer: Buffer): string {
  // Tenta extrair streams de texto do PDF em latin1
  const raw = buffer.toString("latin1");

  // Coleta conteúdo entre operadores BT/ET (Begin Text / End Text do PDF)
  const textBlocks: string[] = [];
  const btEt = /BT([\s\S]*?)ET/g;
  let m;
  while ((m = btEt.exec(raw)) !== null) {
    // Extrai strings entre parênteses dentro do bloco
    const strings = m[1].match(/\(([^)]*)\)/g) ?? [];
    const line = strings.map(s => s.slice(1, -1)).join(" ").trim();
    if (line) textBlocks.push(line);
  }
  return textBlocks.join("\n");
}

function parsePdfText(text: string, rawBuffer: Buffer): { header: ParsedHeader; items: ParsedItem[]; iaFailed: boolean } {
  // Regex para campos comuns de NF-e em PDF
  const cnpj    = text.match(/(\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2})/)?.[1]?.replace(/\D/g, "") ?? "";
  const numero  = text.match(/N[º°ú]\s*[:\s]?\s*(\d{6,9})/i)?.[1] ?? "";
  const serie   = text.match(/[Ss][eé]rie\s*[:\s]?\s*(\d+)/i)?.[1] ?? "";
  const data    = text.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1]
                    ?.split("/").reverse().join("-") ?? "";
  const valor   = parseFloat(
    text.match(/[Vv]alor\s*[Tt]otal\s*[:\s]?\s*R?\$?\s*([\d.,]+)/)?.[1]
      ?.replace(/\./g, "").replace(",", ".") ?? "0"
  );

  // Nome do emitente: primeira linha longa antes do CNPJ
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const cnpjIdx = lines.findIndex(l => l.replace(/\D/g, "").includes(cnpj.slice(0, 8)));
  const nome = cnpjIdx > 0 ? lines[cnpjIdx - 1] : "";

  const iaFailed = !numero && !cnpj && !valor;

  return {
    header: {
      numeroNota:   numero || "PDF importado",
      serie:        serie  || "-",
      emitenteCnpj: cnpj,
      emitenteNome: nome,
      dataEmissao:  data,
      valorTotal:   valor,
      rawContent:   rawBuffer.toString("base64").slice(0, 500) + "…[PDF]",
    },
    items: [],
    iaFailed,
  };
}

// ── Save ao banco + geração de alertas ───────────────────────────────────────

async function saveNote(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  clientId: string,
  header: ParsedHeader,
  items: ParsedItem[],
  iaFailed = false,
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

  if (iaFailed) {
    alerts.push({
      note_id: noteId, client_id: clientId,
      tipo: "pdf_revisao_manual",
      descricao: "PDF importado sem extração completa dos dados. Verifique e preencha os campos manualmente.",
      severidade: "aviso",
    });
  }

  // Insere itens e alertas em paralelo
  await Promise.all([
    dbItems.length > 0 ? supabase.from("fiscal_note_items").insert(dbItems) : Promise.resolve(),
    alerts.length  > 0 ? supabase.from("fiscal_alerts").insert(alerts)      : Promise.resolve(),
  ]);

  const hasCritical = alerts.some(a => a.severidade === "critico");
  if (hasCritical) await supabase.from("fiscal_notes").update({ status: "erro" }).eq("id", noteId);

  return { noteId, alerts, hasCritical };
}

// ── Handler principal ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 20, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  try {
    const supabase = await createSupabaseServerClient();

    // Auth + formData em paralelo
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

    const [clientResult, parsed] = await Promise.all([
      supabase.from("clients").select("id").eq("auth_user_id", user.id).single(),
      isPdf
        ? file.arrayBuffer().then(buf => {
            const buffer = Buffer.from(buf);
            const text   = extractPdfText(buffer);
            return parsePdfText(text, buffer);
          })
        : file.text().then(xml => parseXml(xml)),
    ]);

    const clientData = clientResult.data;
    if (!clientData) return Response.json({ error: "Cliente não encontrado" }, { status: 404 });

    const { header, items, iaFailed } = parsed as { header: ParsedHeader; items: ParsedItem[]; iaFailed?: boolean };

    const { noteId, alerts, hasCritical } = await saveNote(supabase, clientData.id, header, items, iaFailed ?? false);

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
