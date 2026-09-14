/**
 * LCDPR — Livro Caixa Digital do Produtor Rural (layout simplificado, CSV)
 *
 * Anexo "Atividade Rural" da Declaração de IRPF (IN RFB 1.848/2018,
 * Lei 9.250/95 art. 4). Exporta CSV: data, historico, receita, despesa,
 * saldo_acumulado. O layout completo (blocos Q200/Q210 do PVA) está em
 * /api/fiscal/export-lcdpr.
 *
 * Query: ?year=2026 (default: ano atual) · ?clientId=<uuid> (opcional)
 *
 * DT-02 (raio-x 14/09/2026): a versão anterior confiava só na RLS da view
 * lcdpr_entries. Como a policy libera tudo para is_admin(), um admin exportava
 * a soma de TODOS os clientes num único saldo; e o `clientId` que a tela do
 * contador passava era ignorado. Agora o alvo é explícito e sempre filtrado:
 *   - sem clientId → o próprio cliente;
 *   - com clientId ≠ próprio → admin, ou contador com vínculo ativo em
 *     partners_accountants (contador_client_id → producer_client_id).
 */

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { roleToPersona } from "@/lib/persona-themes";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type LcdprRow = {
  data: string;
  historico: string | null;
  receita: number | string;
  despesa: number | string;
  client_id: string;
};

export function toCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function fmtMoneyBR(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, 10, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const url = new URL(req.url);
  const yearParam = url.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
  if (Number.isNaN(year) || year < 2000 || year > 2100) return new Response("year invalido", { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Nao autenticado", { status: 401 });

  const { data: eu } = await supabase.from("clients").select("id, role, name").eq("auth_user_id", user.id).single();
  if (!eu) return new Response("Cliente nao encontrado", { status: 404 });

  // Alvo explícito.
  const pedido = (url.searchParams.get("clientId") ?? "").trim();
  let alvo = eu.id;
  if (pedido && pedido !== eu.id) {
    if (!UUID_RE.test(pedido)) return new Response("clientId invalido", { status: 400 });
    const persona = roleToPersona(eu.role);
    if (persona === "admin") {
      alvo = pedido;
    } else if (persona === "contador") {
      const { data: link } = await supabase
        .from("partners_accountants")
        .select("status")
        .eq("contador_client_id", eu.id)
        .eq("producer_client_id", pedido)
        .eq("status", "active")
        .maybeSingle();
      if (!link) return new Response("Sem vinculo ativo com este produtor", { status: 403 });
      alvo = pedido;
    } else {
      return new Response("Sem permissao para exportar outro cliente", { status: 403 });
    }
  }

  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const { data, error } = await supabase
    .from("lcdpr_entries")
    .select("data, historico, receita, despesa, client_id")
    .eq("client_id", alvo)
    .gte("data", from)
    .lte("data", to)
    .order("data", { ascending: true });
  if (error) return new Response(`Erro ao consultar lcdpr_entries: ${error.message}`, { status: 500 });

  const rows = (data ?? []) as LcdprRow[];
  let saldo = 0;
  const lines: string[] = ["data,historico,receita,despesa,saldo_acumulado"];
  for (const r of rows) {
    const rec = typeof r.receita === "string" ? parseFloat(r.receita) : Number(r.receita ?? 0);
    const des = typeof r.despesa === "string" ? parseFloat(r.despesa) : Number(r.despesa ?? 0);
    saldo += rec - des;
    lines.push([toCsvCell(r.data), toCsvCell(r.historico ?? ""), toCsvCell(fmtMoneyBR(rec)), toCsvCell(fmtMoneyBR(des)), toCsvCell(fmtMoneyBR(saldo))].join(","));
  }

  return new Response(lines.join("\r\n") + "\r\n", {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lcdpr_${year}_${alvo.slice(0, 8)}.csv"`,
      "Cache-Control": "no-store",
      "X-LCDPR-Client": alvo,
    },
  });
}
