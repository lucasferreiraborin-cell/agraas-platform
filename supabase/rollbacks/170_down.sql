-- 170_down · Restaura before_application_upsert como estava em 16/11/2026
-- (volta a falhar em aplicação sem lote).

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

  begin
    select coalesce(withdrawal_days, 0)
    into v_withdrawal_days
    from public.products
    where id = new.product_id;
  exception when undefined_column then
    v_withdrawal_days := 0;
  end;

  new.withdrawal_end_date := new.application_date + v_withdrawal_days;
  new.created_at := coalesce(new.created_at, now());

  return new;
end;
$function$;

COMMIT;
