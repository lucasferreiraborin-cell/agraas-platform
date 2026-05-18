import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // ── Redirects de roteamento (foco bovinos 17/05) ──────────────────
  // Não dependem de auth — rodam antes da Supabase server client criar.
  const path = request.nextUrl.pathname;

  // 1) Cadeias pausadas → /em-breve
  const PAUSED_PREFIXES = ["/ovinos", "/caprinos", "/aves", "/agricultura"];
  for (const prefix of PAUSED_PREFIXES) {
    if (path === prefix || path.startsWith(prefix + "/")) {
      return NextResponse.redirect(new URL("/em-breve", request.nextUrl));
    }
  }

  // 2) Portal PIF /comprador pausado → /em-breve
  // (/compradores plural é operacional financeiro do produtor, não pausar)
  if (path === "/comprador" || path.startsWith("/comprador/")) {
    return NextResponse.redirect(new URL("/em-breve", request.nextUrl));
  }

  // 3) /dashboard → /painel (redirect permanente 301)
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
  const isLoginPage = pathname.startsWith("/login");
  const isPublic    = pathname.startsWith("/reset-password")
                   || pathname.startsWith("/passaporte")
                   || pathname.startsWith("/planos")
                   || pathname.startsWith("/sobre")
                   || pathname.startsWith("/cadastro")
                   || pathname.startsWith("/marketplace");
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

    if (clientData?.role !== "buyer") {
      const url = request.nextUrl.clone();
      url.pathname = "/painel";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
