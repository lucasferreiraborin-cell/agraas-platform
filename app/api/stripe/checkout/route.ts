import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { withApiSentry } from "@/lib/with-sentry";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// ── Zod schema ────────────────────────────────────────────────────────────────
const PostBodySchema = z.object({
  planId: z.enum(["starter", "pro", "enterprise"], {
    error: "planId deve ser 'starter', 'pro' ou 'enterprise'",
  }),
  successUrl: z.string().url("successUrl deve ser uma URL válida"),
  cancelUrl: z.string().url("cancelUrl deve ser uma URL válida"),
});

// ── POST — create Stripe checkout session ─────────────────────────────────────
export const POST = withApiSentry(async function POST(req: NextRequest) {
  const rl = checkRateLimit(req, 10, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bodyParsed = PostBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!bodyParsed.success) {
    return NextResponse.json(
      { error: bodyParsed.error.issues[0].message, details: bodyParsed.error.flatten() },
      { status: 400 },
    );
  }

  // Stripe integration is not yet configured — return 501 with clear message
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe não está configurado neste ambiente" },
      { status: 501 },
    );
  }

  // TODO: implement Stripe Checkout Session creation
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  // const session = await stripe.checkout.sessions.create({ ... });
  // return NextResponse.json({ url: session.url });

  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
});
