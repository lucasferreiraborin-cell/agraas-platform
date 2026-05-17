import { NextRequest, NextResponse } from "next/server";

// Decisão 2026-05-17: foco 100% pecuária bovina. Frentes adjacentes
// pausadas — rotas redirecionam para /em-breve. Código dormente,
// não removido.

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const path = url.pathname;

  // ── Redirect permanente /dashboard → /painel ──────────────────────────
  // /painel é o moderno (Server Component, lê agraas_master_passport_cache).
  // /dashboard é a versão antiga.
  if (path === "/dashboard" || path.startsWith("/dashboard/")) {
    const newUrl = new URL(path.replace(/^\/dashboard/, "/painel"), url);
    newUrl.search = url.search;
    return NextResponse.redirect(newUrl, 301);
  }

  // ── Portal PIF (singular, buyer-only) ────────────────────────────────
  // /compradores (plural) é operacional do Financeiro do produtor — não
  // pausar.
  if (path === "/comprador" || path.startsWith("/comprador/")) {
    return NextResponse.redirect(new URL("/em-breve", url));
  }

  // ── Cadeias pausadas (ovinos/caprinos/aves/agricultura) ──────────────
  const PAUSED_PREFIXES = ["/ovinos", "/caprinos", "/aves", "/agricultura"];
  for (const prefix of PAUSED_PREFIXES) {
    if (path === prefix || path.startsWith(prefix + "/")) {
      return NextResponse.redirect(new URL("/em-breve", url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match tudo exceto: _next, api, arquivos estáticos, favicon
    "/((?!_next|api|favicon.ico|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)",
  ],
};
