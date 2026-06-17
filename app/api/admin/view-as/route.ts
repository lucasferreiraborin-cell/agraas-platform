/**
 * Endpoint do Admin Switcher — só responde se o caller for admin.
 *
 * POST /api/admin/view-as
 * Body: { persona: "produtor" | "frigorifico" | "banco" | null }
 *
 * Quando persona === null: remove o cookie (admin volta a ver "como admin").
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { PERSONA_THEMES, roleToPersona, type Persona } from "@/lib/persona-themes";

const VIEW_AS_COOKIE = "agraas_view_as";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8h

export async function POST(req: NextRequest) {
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: clientData } = await auth
    .from("clients")
    .select("role")
    .eq("auth_user_id", user.id)
    .single();
  if (!clientData || roleToPersona(clientData.role) !== "admin") {
    return NextResponse.json({ error: "Forbidden — only admin can switch view" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const persona = body?.persona ?? null;

  const cookieStore = await cookies();

  if (persona === null) {
    cookieStore.delete(VIEW_AS_COOKIE);
    return NextResponse.json({ ok: true, viewing: "admin" });
  }

  if (!(persona in PERSONA_THEMES) || persona === "admin") {
    return NextResponse.json({ error: "Persona inválida" }, { status: 400 });
  }

  cookieStore.set(VIEW_AS_COOKIE, persona as Persona, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return NextResponse.json({ ok: true, viewing: persona });
}
