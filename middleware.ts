import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

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
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Rotas públicas — deixa passar
  if (pathname === "/login") return response;

  // Não autenticado → login
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verifica role do usuário nas rotas relevantes
  const checkRole =
    pathname === "/" || pathname.startsWith("/comprador");

  if (checkRole) {
    const { data: clientData } = await supabase
      .from("clients")
      .select("role")
      .eq("auth_user_id", user.id)
      .single();

    const role = clientData?.role;

    // Buyer acessando "/" → redireciona para /comprador
    if (role === "buyer" && pathname === "/") {
      return NextResponse.redirect(new URL("/comprador", request.url));
    }

    // Não-buyer tentando acessar /comprador → redireciona para /
    if (role !== "buyer" && pathname.startsWith("/comprador")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|api).*)"],
};
