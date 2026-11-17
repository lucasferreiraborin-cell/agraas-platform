-- ============================================================================
-- 170 · Aplicação sem lote de estoque deixa de falhar
-- ============================================================================
-- Achado do triangulacao-auditor, 16/11/2026, na definição viva do trigger:
--
--   before_application_upsert (BEFORE INSERT OR UPDATE em applications) faz
--   SELECT em stock_batches por new.batch_id e levanta 'Lote de estoque não
--   encontrado' quando batch_id é NULL. Isso derruba os três caminhos que não
--   passam por lote: /aplicacoes (modo manual), EventModal e o app mobile.
--   Nenhuma aplicação foi criada desde 10/04/2026, e editar qualquer uma das
--   60 existentes (todas sem lote) também falha.
--
-- Fix: sem batch_id, pula as checagens de estoque (lote existe / vencido /
-- saldo). Com batch_id, comportamento igual ao de antes. O débito de estoque
-- (apply_stock_debit_v3, AFTER INSERT) já ignora batch_id NULL.
--
-- Mudança deliberada no cálculo da carência: antes o trigger sobrescrevia
-- withdrawal_end_date sempre, inclusive com 0 dias quando não havia produto —
-- apagava o que applications_carencia_autofill (tabela MAPA) tinha acabado de
-- preencher. Agora só preenche quando ainda está vazio.
--
-- Fora deste arquivo: trg_calculate_withdrawal (BEFORE INSERT, dispara depois
-- deste) repete o cálculo pelo produto e pode anular a carência quando não há
-- product_id; e total_cost (dose × custo unitário) nunca é calculado em lugar
-- nenhum. Dois follow-ups, cada um em migration própria.
--
-- NÃO APLICAR sem ordem expressa do Lucas (D-10).
-- Rollback: supabase/rollbacks/170_down.sql
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.before_application_upsert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_available numeric;
  v_expiration date;
  v_withdrawal_days integer := 0;
begin
  if new.batch_id is not null then
    select quantity_available, expiration_date
      into v_available, v_expiration
      from public.stock_batches
     where id = new.batch_id
       for update;

    if v_available is null then
      raise exception 'Lote de estoque não encontrado.';
    end if;

    if v_expiration is not null and new.application_date > v_expiration then
      raise exception 'Não é permitido aplicar produto vencido.';
    end if;

    if coalesce(v_available, 0) < coalesce(new.dose, 0) then
      raise exception 'Estoque insuficiente para esta aplicação.';
    end if;
  end if;

  if new.product_id is not null then
    begin
      select coalesce(withdrawal_days, 0)
        into v_withdrawal_days
        from public.products
       where id = new.product_id;
    exception when undefined_column then
      v_withdrawal_days := 0;
    end;
  end if;

  if new.withdrawal_end_date is null and new.application_date is not null then
    new.withdrawal_end_date := new.application_date + coalesce(v_withdrawal_days, 0);
  end if;
  new.created_at := coalesce(new.created_at, now());

  return new;
end;
$function$;

COMMIT;
