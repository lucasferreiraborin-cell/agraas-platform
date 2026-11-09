/**
 * POST /api/controladoria/notas/[id]/review
 * Muda status de uma NF-e para reviewed ou rejected.
 *
 * Aprovação de nota de ENTRADA também gera estoque real (stock_batches +
 * stock_movements) e lançamento contábil real (accounting_entries) a partir
 * dos itens da nota — antes a tela afirmava que isso acontecia
 * automaticamente e nenhuma rota fazia (achado da auditoria de 09/11/2026).
 *
 * Regra contábil especificada pelo agente de domínio fiscal (09/11/2026),
 * não inventada aqui. Pontos centrais:
 * - ENTRADA: debita Estoque (por NCM) / credita Fornecedores a pagar, valor
 *   bruto do item. Sem crédito fiscal segregado (produtor PF normalmente não
 *   tem ICMS/PIS/Cofins a recuperar em insumo — ver nota da rota).
 * - SAÍDA: só lança se a nota NÃO vier de uma venda já registrada em `sales`
 *   (essas já são contabilizadas por trigger de banco, lançar de novo
 *   duplicaria receita). Nota de saída avulsa (upload direto) gera Receita /
 *   CMV (só com custo confiável) / FUNRURAL (da nota ou calculado).
 * - Compra de animal vivo (NCM 0102.x): usa animals.conta_contabil do animal
 *   vinculado (migration 150, CPC 29 já resolvido por trigger). Sem animal
 *   cadastrado e vinculado ao item, não lança — não tem como saber a conta.
 * - CFOP ausente ou fora do mapeamento => não lança, gera fiscal_alert.
 *   Não lançar errado é melhor que lançar errado.
 * - Idempotente via checagem de accounting_entries ativos para a nota.
 */

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import type { SupabaseClient } from "@supabase/supabase-js";

type RouteContext = { params: Promise<{ id: string }> };

type InvoiceItemRow = {
  id: string;
  ncm: string | null;
  cfop: string | null;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  total_price: number | null;
  linked_animal_id: string | null;
};

// Mesmo critério de app/api/fiscal/apply-stock/route.ts (ncmToCategory),
// adaptado pra código de conta de estoque em vez de categoria de insumo.
function ncmToEstoqueAccountCode(ncm: string | null): string {
  const prefix = (ncm ?? "").slice(0, 4);
  if (["3002", "3004", "3808", "3006"].includes(prefix)) return "1.1.03.01"; // sanitários
  if (["2309", "2302", "2301", "1209", "1001", "1005"].includes(prefix)) return "1.1.03.02"; // nutricionais
  if (["3101", "3102", "3103", "3104", "3105"].includes(prefix)) return "1.1.03.03"; // defensivos/fertilizantes
  return "1.1.03"; // genérico — fallback
}

const CFOP_ESTOQUE = new Set(["1101", "2101", "1102", "2102"]);
const CFOP_IMOBILIZADO = new Set(["1551", "2551"]);

async function resolveAccountId(
  supabase: SupabaseClient,
  clientId: string,
  code: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("chart_of_accounts")
    .select("id")
    .eq("client_id", clientId)
    .eq("code", code)
    .maybeSingle();
  return data?.id ?? null;
}

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
    .select("id, client_id, direction, issued_at, number, issuer_name, gross_value, funrural_value, icms_value, pis_value, cofins_value")
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
  let accountingApplied = 0;
  const accountingFailures: string[] = [];
  let accountingSkippedReason: string | undefined;

  if (action === "approve" && invoice.direction === "entrada") {
    const { data: items } = await supabase
      .from("fiscal_invoice_items")
      .select("id, ncm, cfop, description, quantity, unit, unit_price, total_price, linked_animal_id")
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

  // ── Lançamento contábil (accounting_entries) ────────────────────────────
  if (action === "approve") {
    const { data: existingEntries } = await supabase
      .from("accounting_entries")
      .select("id")
      .eq("source_type", "fiscal_invoice")
      .eq("source_id", invoice.id)
      .is("reversed_by", null)
      .is("reversal_of", null)
      .limit(1);

    if (existingEntries && existingEntries.length > 0) {
      accountingSkippedReason = "already_posted";
    } else if (invoice.direction === "entrada") {
      // Nota: não há como garantir aqui que o plano de contas completo (114
      // contas, migration 145) já foi semeado para este client_id — a função
      // que faria isso (_seed_rural_chart_of_accounts) só tem EXECUTE para
      // service_role, não para o usuário autenticado. Se faltar algum código,
      // resolveAccountId retorna null e o item cai no caminho seguro abaixo
      // (não lança, registra falha) — consistente com "não lançar errado".
      const { data: items } = await supabase
        .from("fiscal_invoice_items")
        .select("id, ncm, cfop, description, quantity, unit, unit_price, total_price, linked_animal_id")
        .eq("fiscal_invoice_id", id);

      const fornecedoresId = await resolveAccountId(supabase, invoice.client_id, "2.1.01");

      for (const item of (items ?? []) as InvoiceItemRow[]) {
        const amount = Number(item.total_price ?? 0);
        if (amount <= 0) continue;

        if (!item.cfop) {
          accountingFailures.push(`item ${item.id}: sem CFOP — lançamento não gerado`);
          await supabase.from("fiscal_alerts").insert({
            client_id: invoice.client_id,
            fiscal_invoice_id: invoice.id,
            severity: "warning",
            alert_type: "accounting_not_posted_missing_cfop",
            message: `Item "${item.description ?? item.id}" sem CFOP — lançamento contábil não gerado automaticamente.`,
          });
          continue;
        }

        // Compra de animal vivo (NCM 0102.x): a classificação CPC 29 (ativo
        // biológico circulante x matriz/reprodutor) já é resolvida pela
        // migration 150 — todo animal cadastrado tem animals.conta_contabil
        // setado por trigger. Só dá pra lançar se o item já estiver vinculado
        // a um animal cadastrado (linked_animal_id); sem isso, não tem como
        // saber a conta sem chutar categoria/destinação do animal.
        if ((item.ncm ?? "").startsWith("0102")) {
          let animalAccountId: string | null = null;
          if (item.linked_animal_id) {
            const { data: animalRow } = await supabase
              .from("animals")
              .select("conta_contabil")
              .eq("id", item.linked_animal_id)
              .maybeSingle();
            if (animalRow?.conta_contabil) {
              animalAccountId = await resolveAccountId(supabase, invoice.client_id, animalRow.conta_contabil);
            }
          }

          if (animalAccountId && fornecedoresId) {
            const { error: animalEntryError } = await supabase.from("accounting_entries").insert({
              client_id: invoice.client_id,
              entry_date: invoice.issued_at ? invoice.issued_at.slice(0, 10) : null,
              debit_account_id: animalAccountId,
              credit_account_id: fornecedoresId,
              amount,
              description: `Compra de animal — NF-e ${invoice.number ?? id}`,
              source_type: "fiscal_invoice",
              source_id: invoice.id,
            });
            if (animalEntryError) accountingFailures.push(`item ${item.id}: lançamento animal — ${animalEntryError.message}`);
            else accountingApplied++;
          } else {
            accountingFailures.push(`item ${item.id}: compra de animal vivo sem animal cadastrado vinculado — lançamento não gerado`);
            await supabase.from("fiscal_alerts").insert({
              client_id: invoice.client_id,
              fiscal_invoice_id: invoice.id,
              severity: "info",
              alert_type: "accounting_not_posted_unlinked_animal_purchase",
              message: `Item "${item.description ?? item.id}" é compra de animal vivo (NCM ${item.ncm}) — cadastre o animal e vincule à nota (linked_animal_id) para a conta CPC 29 (ativo biológico) ser resolvida automaticamente.`,
            });
          }
          continue;
        }

        if (!CFOP_ESTOQUE.has(item.cfop) && !CFOP_IMOBILIZADO.has(item.cfop)) {
          accountingFailures.push(`item ${item.id}: CFOP ${item.cfop} fora do mapeamento — lançamento não gerado`);
          await supabase.from("fiscal_alerts").insert({
            client_id: invoice.client_id,
            fiscal_invoice_id: invoice.id,
            severity: "warning",
            alert_type: "accounting_not_posted_unmapped_cfop",
            message: `Item "${item.description ?? item.id}" com CFOP ${item.cfop} fora do mapeamento conhecido — lançamento contábil não gerado automaticamente.`,
          });
          continue;
        }

        const debitCode = CFOP_IMOBILIZADO.has(item.cfop)
          ? "1.2.02.03" // Máquinas e equipamentos — caso mais comum; não há
            // como diferenciar terra/benfeitoria/veículo só pelo item da nota.
          : ncmToEstoqueAccountCode(item.ncm);
        const debitId = await resolveAccountId(supabase, invoice.client_id, debitCode);

        if (!debitId || !fornecedoresId) {
          accountingFailures.push(`item ${item.id}: conta contábil não encontrada (${debitCode} ou 2.1.01)`);
          continue;
        }

        const { error: entryError } = await supabase.from("accounting_entries").insert({
          client_id: invoice.client_id,
          entry_date: invoice.issued_at ? invoice.issued_at.slice(0, 10) : null,
          debit_account_id: debitId,
          credit_account_id: fornecedoresId,
          amount,
          description: `Compra — NF-e ${invoice.number ?? id} (${item.ncm ?? "NCM n/d"})`,
          source_type: "fiscal_invoice",
          source_id: invoice.id,
        });
        if (entryError) accountingFailures.push(`item ${item.id}: lançamento — ${entryError.message}`);
        else accountingApplied++;
      }

      // Aviso informativo (não altera o lançamento): a regra acima lança o
      // item pelo valor bruto, assumindo ICMS/PIS/Cofins recuperável zerado
      // — verdade na prática pra insumo agropecuário vendido a produtor rural
      // (isenção Convênio ICMS 100/97; alíquota zero Lei 10.925/2004, e
      // mesmo quando não é zero o crédito normalmente só vale pra PJ no
      // lucro real). Se a nota vier com imposto destacado, sinaliza que a
      // simplificação está sendo usada fora do caso que ela cobre bem —
      // segregar o crédito exigiria confirmação do regime tributário do
      // cliente com o contador antes de automatizar.
      const recoverableTax =
        Number(invoice.icms_value ?? 0) + Number(invoice.pis_value ?? 0) + Number(invoice.cofins_value ?? 0);
      if (recoverableTax > 0) {
        await supabase.from("fiscal_alerts").insert({
          client_id: invoice.client_id,
          fiscal_invoice_id: invoice.id,
          severity: "info",
          alert_type: "accounting_entrada_tax_not_segregated",
          message: `NF-e ${invoice.number ?? id} tem R$ ${recoverableTax.toFixed(2)} de ICMS/PIS/Cofins destacado — o lançamento de estoque foi feito pelo valor bruto (sem segregar crédito fiscal). Confirme com o contador se este cliente tem direito a crédito antes de corrigir manualmente.`,
        });
      }
    } else if (invoice.direction === "saida") {
      // Venda já contabilizada pelo fluxo interno de /vendas (trigger de
      // banco em sales) não pode ser lançada de novo aqui — duplicaria receita.
      const { data: linkedSale } = await supabase
        .from("sales")
        .select("id")
        .eq("fiscal_invoice_id", id)
        .maybeSingle();

      if (linkedSale) {
        accountingSkippedReason = "already_booked_via_sales";
      } else {
        const entryDate = invoice.issued_at ? invoice.issued_at.slice(0, 10) : null;
        const grossValue = Number(invoice.gross_value ?? 0);

        // Bloco 1 — Receita
        if (grossValue > 0) {
          const caixaId = await resolveAccountId(supabase, invoice.client_id, "1.1.01");
          const receitaId = await resolveAccountId(supabase, invoice.client_id, "3.1.01");
          if (caixaId && receitaId) {
            const { error: receitaError } = await supabase.from("accounting_entries").insert({
              client_id: invoice.client_id,
              entry_date: entryDate,
              debit_account_id: caixaId,
              credit_account_id: receitaId,
              amount: grossValue,
              description: `Venda — NF-e ${invoice.number ?? id}`,
              source_type: "fiscal_invoice",
              source_id: invoice.id,
            });
            if (receitaError) accountingFailures.push(`receita: ${receitaError.message}`);
            else accountingApplied++;
          } else {
            accountingFailures.push("receita: conta contábil não encontrada (1.1.01 ou 3.1.01)");
          }
        }

        // Bloco 2 — CMV, só com custo confiável (não estimado) dos animais
        // vinculados aos itens da nota.
        const { data: saleItems } = await supabase
          .from("fiscal_invoice_items")
          .select("linked_animal_id")
          .eq("fiscal_invoice_id", id)
          .not("linked_animal_id", "is", null);

        const animalIds = (saleItems ?? [])
          .map((i) => i.linked_animal_id)
          .filter((v): v is string => !!v);

        if (animalIds.length > 0) {
          const { data: costRows } = await supabase
            .from("animal_cost_summary")
            .select("animal_id, total_cost, cost_estimated")
            .in("animal_id", animalIds);

          const allReliable =
            costRows != null &&
            costRows.length === animalIds.length &&
            costRows.every((r) => r.total_cost != null && r.cost_estimated === false);

          if (allReliable) {
            const totalCost = (costRows ?? []).reduce((sum, r) => sum + Number(r.total_cost ?? 0), 0);
            if (totalCost > 0) {
              const cmvId = await resolveAccountId(supabase, invoice.client_id, "5.1.01");
              const estoqueId = await resolveAccountId(supabase, invoice.client_id, "1.1.03");
              if (cmvId && estoqueId) {
                const { error: cmvError } = await supabase.from("accounting_entries").insert({
                  client_id: invoice.client_id,
                  entry_date: entryDate,
                  debit_account_id: cmvId,
                  credit_account_id: estoqueId,
                  amount: totalCost,
                  description: `CMV — NF-e ${invoice.number ?? id}`,
                  source_type: "fiscal_invoice",
                  source_id: invoice.id,
                });
                if (cmvError) accountingFailures.push(`CMV: ${cmvError.message}`);
                else accountingApplied++;
              }
            }
          }
          // Sem custo confiável para todos os animais: não lança CMV dessa
          // nota — melhor sem número do que número chutado.
        }

        // Bloco 3 — FUNRURAL (da nota, ou calculado pela alíquota do cliente)
        let funruralValue = Number(invoice.funrural_value ?? 0);
        if (funruralValue <= 0 && grossValue > 0) {
          const { data: clientRow } = await supabase
            .from("clients")
            .select("funrural_rate")
            .eq("id", invoice.client_id)
            .maybeSingle();
          const rate = Number(clientRow?.funrural_rate ?? 0);
          if (rate > 0) funruralValue = grossValue * rate;
        }
        if (funruralValue > 0) {
          const cmvId = await resolveAccountId(supabase, invoice.client_id, "5.1.01");
          const funruralId = await resolveAccountId(supabase, invoice.client_id, "2.1.05");
          if (cmvId && funruralId) {
            const { error: funruralError } = await supabase.from("accounting_entries").insert({
              client_id: invoice.client_id,
              entry_date: entryDate,
              debit_account_id: cmvId,
              credit_account_id: funruralId,
              amount: funruralValue,
              description: `FUNRURAL — NF-e ${invoice.number ?? id}`,
              source_type: "fiscal_invoice",
              source_id: invoice.id,
            });
            if (funruralError) accountingFailures.push(`FUNRURAL: ${funruralError.message}`);
            else accountingApplied++;
          }
        }
      }
    }
  }

  return NextResponse.json({
    ok: true,
    status: newStatus,
    stock_applied: stockApplied,
    ...(stockFailures.length > 0 ? { stock_failures: stockFailures } : {}),
    accounting_applied: accountingApplied,
    ...(accountingSkippedReason ? { accounting_skipped_reason: accountingSkippedReason } : {}),
    ...(accountingFailures.length > 0 ? { accounting_failures: accountingFailures } : {}),
  });
}
