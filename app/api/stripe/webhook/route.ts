import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-service";
import { sendTemplateEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe não configurado" }, { status: 501 });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = createSupabaseServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const clientId = session.metadata?.client_id;
        const planId = session.metadata?.plan_id;
        if (clientId && planId) {
          await db.from("clients").update({
            plan: planId,
            plan_started_at: new Date().toISOString(),
            stripe_customer_id: session.customer,
          }).eq("id", clientId);

          await db.from("subscription_events").insert({
            client_id: clientId,
            event_type: "created",
            plan: planId,
            amount: session.amount_total ? session.amount_total / 100 : null,
            external_id: session.id,
          });
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as any;
        const customerId = invoice.customer;
        const { data: client } = await db
          .from("clients")
          .select("id, plan, name, email, auth_user_id")
          .eq("stripe_customer_id", customerId)
          .single();
        if (client) {
          await db.from("subscription_events").insert({
            client_id: client.id,
            event_type: "payment_success",
            plan: client.plan,
            amount: invoice.amount_paid ? invoice.amount_paid / 100 : null,
            external_id: invoice.id,
          });

          // Email de confirmação. invoice.customer_email é o caminho mais
          // direto; se ausente, fallback para clients.email e por último
          // para auth.users via service client.
          let recipientEmail: string | null =
            (invoice.customer_email as string | undefined) ?? client.email ?? null;
          if (!recipientEmail && client.auth_user_id) {
            const { data: authUser } = await db.auth.admin.getUserById(client.auth_user_id);
            recipientEmail = authUser?.user?.email ?? null;
          }

          if (recipientEmail) {
            const result = await sendTemplateEmail(
              "payment_confirmed",
              recipientEmail,
              client.name ?? "cliente",
            );
            if (!result.ok && result.reason === "send_failed") {
              console.error("[Stripe Webhook] payment_confirmed email failed:", result.error);
            }
          } else {
            console.warn("[Stripe Webhook] invoice.paid sem email do cliente", { client_id: client.id });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const customerId = invoice.customer;
        const { data: client } = await db.from("clients").select("id, plan").eq("stripe_customer_id", customerId).single();
        if (client) {
          await db.from("subscription_events").insert({
            client_id: client.id,
            event_type: "payment_failed",
            plan: client.plan,
            amount: invoice.amount_due ? invoice.amount_due / 100 : null,
            external_id: invoice.id,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        const customerId = sub.customer;
        const { data: client } = await db.from("clients").select("id").eq("stripe_customer_id", customerId).single();
        if (client) {
          await db.from("clients").update({ plan: "starter" }).eq("id", client.id);
          await db.from("subscription_events").insert({
            client_id: client.id,
            event_type: "cancelled",
            external_id: sub.id,
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error("[Stripe Webhook] Processing error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
