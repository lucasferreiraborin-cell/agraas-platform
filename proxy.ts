import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // ── Redirects de roteamento (foco bovinos 17/05) ──────────────────
  // Não dependem de auth — rodam antes da Supabase server client criar.
  const path = request.nextUrl.pathname;

  // 0) Rotas API têm auth próprio (Bearer/x-vercel-cron/session/etc).
  // Proxy NÃO deve forçar redirect /login em /api/* (quebra Stripe webhook,
  // Vercel cron, self-heal, insights). Apontado pelo pentest 24/06/2026.
  if (path.startsWith("/api/")) {
    return NextResponse.next({ request });
  }

  // Repassa o caminho para o layout raiz: o portal /gestao tem shell próprio e
  // o layout raiz precisa saber disso para não envolver com a sidebar da plataforma.
  request.headers.set("x-agraas-path", path);

  // 1) Cadeias pausadas → /em-breve
  const PAUSED_PREFIXES = ["/ovinos", "/caprinos", "/aves", "/agricultura"];
  for (const prefix of PAUSED_PREFIXES) {
    if (path === prefix || path.startsWith(prefix + "/")) {
      return NextResponse.redirect(new URL("/em-breve", request.nextUrl));
    }
  }

  // 2) /dashboard → /painel (redirect permanente 301)
  // Removido em 24/06: /comprador NÃO redireciona mais pra /em-breve.
  // Sprint B/C destravou persona Frigorífico — /comprador é ativo.
  if (path === "/dashboard" || path.startsWith("/dashboard/")) {
    const newUrl = new URL(path.replace(/^\/dashboard/, "/painel"), request.nextUrl);
    newUrl.search = request.nextUrl.search;
    return NextResponse.redirect(newUrl, 301);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Portal Agraas Gestão (mini ERP, 23/11/2026) ────────────────────
  // Login próprio em /gestao/entrar; o resto de /gestao exige sessão.
  // Mesma conta da plataforma — só o caminho de entrada e o shell mudam.
  if (pathname === "/gestao" || pathname.startsWith("/gestao/")) {
    const isGestaoLogin = pathname.startsWith("/gestao/entrar");
    if (!user && !isGestaoLogin) {
      const url = request.nextUrl.clone();
      url.pathname = "/gestao/entrar";
      url.search = "";
      return NextResponse.redirect(url);
    }
    if (user && isGestaoLogin) {
      const url = request.nextUrl.clone();
      url.pathname = "/gestao";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const isLoginPage = pathname.startsWith("/login");
  const isPublic    = pathname.startsWith("/reset-password")
                   || pathname.startsWith("/passaporte")
                   || pathname.startsWith("/planos")
                   || pathname.startsWith("/sobre")
                   || pathname.startsWith("/cadastro")
                   || pathname.startsWith("/marketplace")
                   // P3 (14/09): links do rodapé e rotas pausadas caíam no /login
                   || pathname.startsWith("/privacidade")
                   || pathname.startsWith("/termos")
                   || pathname.startsWith("/em-breve");
  // "/" é landing pública — qualquer um acessa
  const isLanding = pathname === "/";

  if (!user && !isLoginPage && !isPublic && !isLanding) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/painel";
    return NextResponse.redirect(url);
  }

  // User logado acessando "/" → vai para o painel (buyer → /comprador)
  if (user && isLanding) {
    const { data: clientData } = await supabase
      .from("clients")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();

    const url = request.nextUrl.clone();
    url.pathname = clientData?.role === "buyer" ? "/comprador" : "/painel";
    return NextResponse.redirect(url);
  }

  // Não-buyer tentando acessar /comprador → redireciona para /
  if (user && request.nextUrl.pathname.startsWith("/comprador")) {
    const { data: clientData } = await supabase
      .from("clients")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();

    // AUTH-09 (14/09): admin também entra — as páginas já guardam via requirePersona.
    if (!["buyer", "admin"].includes(clientData?.role ?? "")) {
      const url = request.nextUrl.clone();
      url.pathname = "/painel";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // P5 (14/09): og-image, ícones, robots e sitemap não podem cair no /login.
    // 05/11: llms.txt também — senão crawler de IA recebe redirect pro login
    // em vez do conteúdo (achado ao verificar o deploy de SEO/AI discovery).
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|opengraph-image|twitter-image|robots.txt|sitemap.xml|llms.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
