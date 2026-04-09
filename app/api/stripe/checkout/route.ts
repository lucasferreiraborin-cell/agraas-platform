import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const PostBodySchema = z.object({
  planId: z.enum(["starter", "pro", "enterprise"]),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

const PLAN_PRICES: Record<string, { amount: number; name: string }> = {
  starter:    { amount: 29900,  name: "Agraas Starter" },
  pro:        { amount: 69900,  name: "Agraas Pro" },
  enterprise: { amount: 149900, name: "Agraas Enterprise" },
};

export async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 10, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = PostBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0].message }, { status: 400 });

  const { data: client } = await supabase.from("clients").select("id, billing_exempt, plan, billing_email").eq("auth_user_id", user.id).single();
  if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  if (client.billing_exempt) {
    return NextResponse.json({ error: "Plano pilot isento de cobrança" }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe não configurado neste ambiente" }, { status: 501 });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const plan = PLAN_PRICES[body.data.planId];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card", "boleto"],
      customer_email: client.billing_email ?? user.email ?? undefined,
      metadata: { client_id: client.id, plan_id: body.data.planId },
      line_items: [{
        price_data: {
          currency: "brl",
          product_data: { name: plan.name },
          unit_amount: plan.amount,
          recurring: { interval: "month" },
        },
        quantity: 1,
      }],
      success_url: body.data.successUrl,
      cancel_url: body.data.cancelUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[Stripe Checkout]", err);
    return NextResponse.json({ error: "Erro ao criar sessão de pagamento" }, { status: 502 });
  }
}
