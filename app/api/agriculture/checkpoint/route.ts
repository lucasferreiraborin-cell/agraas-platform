import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const VALID_STAGES = ["fazenda","armazem","transportadora","porto_origem","navio","porto_destino","entregue"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      shipment_id,
      stage,
      stage_date,
      quantity_confirmed_tons,
      quantity_lost_tons,
      loss_cause,
      location_name,
      responsible_name,
      notes,
    } = body;

    // Basic validation
    if (!shipment_id || typeof shipment_id !== "string") {
      return NextResponse.json({ error: "shipment_id obrigatório." }, { status: 400 });
    }
    if (!VALID_STAGES.includes(stage)) {
      return NextResponse.json({ error: "Estágio inválido." }, { status: 400 });
    }
    if (!stage_date) {
      return NextResponse.json({ error: "Data obrigatória." }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // Verify authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    // Resolve client_id
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado." }, { status: 403 });
    }

    // Verify shipment belongs to this client
    const { data: shipment } = await supabase
      .from("crop_shipments")
      .select("id")
      .eq("id", shipment_id)
      .eq("client_id", client.id)
      .single();

    if (!shipment) {
      return NextResponse.json({ error: "Embarque não encontrado." }, { status: 404 });
    }

    const { error: insertError } = await supabase
      .from("crop_shipment_tracking")
      .insert({
        shipment_id,
        client_id:               client.id,
        stage,
        stage_date,
        quantity_confirmed_tons: quantity_confirmed_tons ?? null,
        quantity_lost_tons:      quantity_lost_tons ?? 0,
        loss_cause:              loss_cause ?? null,
        location_name:           location_name ?? null,
        responsible_name:        responsible_name ?? null,
        notes:                   notes ?? null,
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}
