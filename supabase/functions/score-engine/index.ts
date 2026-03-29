/**
 * score-engine — Supabase Edge Function
 *
 * Centraliza o cálculo do Agraas Score via HTTP.
 * Chama a função SQL calculate_agraas_score(p_animal_id) que é a única
 * fonte de verdade para o algoritmo (algorithm_version = 'v2').
 *
 * POST /functions/v1/score-engine
 * Body (uma das opções):
 *   { "animal_id": "<uuid>" }                    → recalcula 1 animal
 *   { "animal_ids": ["<uuid>", ...] }            → recalcula N animais
 *
 * Requer header: Authorization: Bearer <service_role_key>
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const { animal_id, animal_ids } = body as {
      animal_id?: string;
      animal_ids?: string[];
    };

    // ── Single animal ──────────────────────────────────────────────────────
    if (animal_id) {
      const { data, error } = await supabase.rpc("calculate_agraas_score", {
        p_animal_id: animal_id,
      });
      if (error) throw error;
      return Response.json(
        { ok: true, animal_id, total_score: data },
        { headers: CORS },
      );
    }

    // ── Batch animals ──────────────────────────────────────────────────────
    if (Array.isArray(animal_ids) && animal_ids.length > 0) {
      const results: { animal_id: string; total_score: number | null }[] = [];
      for (const id of animal_ids) {
        const { data, error } = await supabase.rpc("calculate_agraas_score", {
          p_animal_id: id,
        });
        results.push({ animal_id: id, total_score: error ? null : data });
      }
      return Response.json({ ok: true, results }, { headers: CORS });
    }

    return Response.json(
      { error: "Provide animal_id (string) or animal_ids (array)" },
      { status: 400, headers: CORS },
    );
  } catch (err) {
    return Response.json(
      { error: String(err) },
      { status: 500, headers: CORS },
    );
  }
});
