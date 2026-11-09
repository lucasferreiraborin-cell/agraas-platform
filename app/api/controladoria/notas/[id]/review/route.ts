/**
 * POST /api/controladoria/notas/[id]/review
 * Muda status de uma NF-e para reviewed ou rejected.
 *
 * Aprovação de nota de ENTRADA também gera estoque real (stock_batches +
 * stock_movements) a partir dos itens da nota — antes a tela afirmava que
 * isso acontecia automaticamente e nenhuma rota fazia (achado da auditoria
 * de 09/11/2026). Saída não mexe em estoque aqui; dedução por venda é fluxo
 * separado. Idempotente: só processa itens ainda sem linked_stock_batch_id.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

type RouteContext = { params: Promise<{ id: string }> };

type InvoiceItemRow = {
  id: string;
  ncm: string | null;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
};

export async function POST(req: NextRequest, { params }: RouteContext) {
  const rl = checkRateLimit(req, 60, 60_000);
  if (!rl.allowed) return tooManyRequests(rl.retryAfter);

  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { action?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, reason } = body;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }
  if (action === "reject" && !reason?.trim()) {
    return NextResponse.json({ error: "reason required for rejection" }, { status: 400 });
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from("fiscal_invoices")
    .select("id, client_id, direction, issued_at, number, issuer_name")
    .eq("id", id)
    .maybeSingle();
  if (invoiceError || !invoice) {
    return NextResponse.json({ error: invoiceError?.message ?? "Nota não encontrada" }, { status: 404 });
  }

  const newStatus = action === "approve" ? "reviewed" : "rejected";
  // Ao acionar (aprovar OU rejeitar) a nota deixa de precisar de revisão humana —
  // limpar a flag aqui evita o bug de "N pendentes" fantasma quando status já mudou.
  const update: Record<string, string | boolean> = {
    status: newStatus,
    needs_human_review: false,
  };
  // fiscal_invoices não tem coluna rejection_reason — o motivo de rejeição vai em
  // review_notes. Gravar a coluna inexistente fazia o update falhar e a rejeição dar 500.
  if (action === "reject") update.review_notes = reason!.trim();

  const { error } = await supabase
    .from("fiscal_invoices")
    .update(update)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let stockApplied = 0;
  const stockFailures: string[] = [];

  if (action === "approve" && invoice.direction === "entrada") {
    const { data: items } = await supabase
      .from("fiscal_invoice_items")
      .select("id, ncm, description, quantity, unit, unit_price")
      .eq("fiscal_invoice_id", id)
      .is("linked_stock_batch_id", null);

    for (const item of (items ?? []) as InvoiceItemRow[]) {
      const quantity = Number(item.quantity ?? 0);
      if (quantity <= 0) continue;

      // Resolve produto por NCM dentro do cliente; cria um registro mínimo se
      // não existir — mesmo princípio de qualquer ERP ao receber item novo.
      let productId: string | null = null;
      if (item.ncm) {
        const { data: existingProduct } = await supabase
          .from("products")
          .select("id")
          .eq("client_id", invoice.client_id)
          .eq("ncm", item.ncm)
          .maybeSingle();
        productId = existingProduct?.id ?? null;
      }
      if (!productId) {
        const { data: newProduct, error: productError } = await supabase
          .from("products")
          .insert({
            client_id: invoice.client_id,
            name: item.description ?? "Produto sem descrição",
            ncm: item.ncm,
            unit: item.unit,
            active: true,
            notes: `Criado automaticamente a partir da NF-e ${invoice.number ?? id}`,
          })
          .select("id")
          .single();
        if (productError || !newProduct) {
          stockFailures.push(`item ${item.id}: produto — ${productError?.message ?? "falha desconhecida"}`);
          continue;
        }
        productId = newProduct.id;
      }

      const { data: batch, error: batchError } = await supabase
        .from("stock_batches")
        .insert({
          client_id: invoice.client_id,
          product_id: productId,
          quantity_received: quantity,
          quantity_available: quantity,
          unit_cost: item.unit_price,
          entry_date: invoice.issued_at ? invoice.issued_at.slice(0, 10) : null,
          supplier_name: invoice.issuer_name,
          document_source: invoice.number ? `NF-e ${invoice.number}` : `NF-e ${id}`,
        })
        .select("id")
        .single();
      if (batchError || !batch) {
        stockFailures.push(`item ${item.id}: lote — ${batchError?.message ?? "falha desconhecida"}`);
        continue;
      }

      const { error: movementError } = await supabase.from("stock_movements").insert({
        client_id: invoice.client_id,
        product_id: productId,
        batch_id: batch.id,
        movement_type: "entry",
        quantity,
        reference_table: "fiscal_invoices",
        reference_id: invoice.id,
      });
      if (movementError) stockFailures.push(`item ${item.id}: movimento — ${movementError.message}`);

      const { error: linkError } = await supabase
        .from("fiscal_invoice_items")
        .update({ linked_stock_batch_id: batch.id })
        .eq("id", item.id);
      if (linkError) stockFailures.push(`item ${item.id}: vínculo — ${linkError.message}`);

      stockApplied++;
    }
  }

  return NextResponse.json({
    ok: true,
    status: newStatus,
    stock_applied: stockApplied,
    ...(stockFailures.length > 0 ? { stock_failures: stockFailures } : {}),
  });
}
