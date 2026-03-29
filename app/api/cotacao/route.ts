import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

const CEPEA_URL = "https://www.cepea.esalq.usp.br/br/indicador/boi-gordo.aspx";
const REVALIDATE_SECONDS = 6 * 60 * 60; // 6h

// Tenta extrair cotação do HTML do CEPEA
async function fetchCepeaCotacao(): Promise<number | null> {
  try {
    const res = await fetch(CEPEA_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AgraasBot/1.0)" },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // CEPEA exibe o indicador em tabelas — busca padrão R$ 9.999,99 ou 9.999,99
    const match = html.match(/R\$\s*([\d.]+,\d{2})|(\d{1,3}(?:\.\d{3})*,\d{2})/);
    if (!match) return null;
    const raw = (match[1] ?? match[2]).replace(/\./g, "").replace(",", ".");
    const value = parseFloat(raw);
    // Sanity check: cotação esperada entre R$200 e R$700/@
    if (value < 200 || value > 700) return null;
    return value;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const rl = checkRateLimit(req, 100, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const supabase = await createSupabaseServerClient();

  // Lê valor atual do banco
  const { data: stored } = await supabase
    .from("platform_settings")
    .select("value, updated_at")
    .eq("key", "cotacao_arroba")
    .single();

  const storedValue = stored ? parseFloat(stored.value ?? "330") : 330;
  const storedAt = stored?.updated_at ?? null;

  // Verifica se precisa atualizar (mais de 6h desde última atualização)
  const needsRefresh = !storedAt ||
    (Date.now() - new Date(storedAt).getTime()) > REVALIDATE_SECONDS * 1000;

  if (needsRefresh) {
    const live = await fetchCepeaCotacao();
    if (live) {
      await supabase
        .from("platform_settings")
        .upsert({ key: "cotacao_arroba", value: String(live), updated_at: new Date().toISOString() });
      return Response.json({ cotacao: live, fonte: "cepea", updated_at: new Date().toISOString() });
    }
  }

  return Response.json({
    cotacao: storedValue,
    fonte: "cache",
    updated_at: storedAt,
  });
}

// POST: atualização manual pelo admin
export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 100, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Não autenticado", { status: 401 });

  const { data: clientData } = await supabase
    .from("clients")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();

  if (clientData?.role !== "admin") return new Response("Sem permissão", { status: 403 });

  const { cotacao } = await req.json();
  const value = parseFloat(cotacao);
  if (!value || value < 100 || value > 1000) {
    return new Response("Cotação inválida", { status: 400 });
  }

  await supabase
    .from("platform_settings")
    .upsert({ key: "cotacao_arroba", value: String(value), updated_at: new Date().toISOString() });

  // Tenta scraping ao mesmo tempo para ter o valor mais recente
  const live = await fetchCepeaCotacao();
  const final = live ?? value;
  if (live && live !== value) {
    await supabase
      .from("platform_settings")
      .upsert({ key: "cotacao_arroba", value: String(live), updated_at: new Date().toISOString() });
  }

  return Response.json({ cotacao: final, fonte: live ? "cepea" : "manual", updated_at: new Date().toISOString() });
}
