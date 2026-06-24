-- 129_fix_rls_cross_tenant_leak
-- Aplicada em producao via MCP em 2026-06-23 (project ixuxawcgwhrrrnwendxr).
-- Fecha vazamento cross-tenant em cost_records, stock_movements e sales.
-- Causa: policies "allow_all" com USING(true) deixavam qualquer cliente ler/escrever dados de todos.
-- Solucao: client_id por tenant + policies (is_admin() OR client_id = get_my_client_id()).

-- ===================== cost_records =====================
alter table public.cost_records add column if not exists client_id uuid references public.clients(id);

-- backfill resolvavel: animal -> lote
update public.cost_records cr set client_id = a.client_id
  from public.animals a where cr.animal_id = a.id and cr.client_id is null;
update public.cost_records cr set client_id = l.client_id
  from public.lots l where cr.lot_id = l.id and cr.client_id is null;
-- orfaos (sem animal/lote resolvivel): atribui ao unico cliente que possui custos (evita ocultar dado)
update public.cost_records set client_id = (
  select client_id from public.cost_records where client_id is not null
  group by client_id order by count(*) desc limit 1
) where client_id is null;

-- default automatico de client_id em inserts futuros (o app insere sem client_id)
create or replace function public._cost_records_set_client_id()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.client_id is null then
    new.client_id := coalesce(
      (select a.client_id from public.animals a where a.id = new.animal_id),
      (select l.client_id from public.lots l where l.id = new.lot_id),
      get_my_client_id()
    );
  end if;
  return new;
end $$;
drop trigger if exists trg_cost_records_set_client_id on public.cost_records;
create trigger trg_cost_records_set_client_id
  before insert on public.cost_records
  for each row execute function public._cost_records_set_client_id();

-- remove policies permissivas
drop policy if exists allow_all_insert on public.cost_records;
drop policy if exists allow_insert_cost_records on public.cost_records;
drop policy if exists allow_all_select on public.cost_records;
drop policy if exists allow_read_cost_records on public.cost_records;
drop policy if exists allow_all_update on public.cost_records;
drop policy if exists allow_update_cost_records on public.cost_records;
-- isolamento por tenant
create policy cost_records_select on public.cost_records for select
  using (is_admin() or client_id = get_my_client_id());
create policy cost_records_insert on public.cost_records for insert
  with check (is_admin() or client_id = get_my_client_id());
create policy cost_records_update on public.cost_records for update
  using (is_admin() or client_id = get_my_client_id())
  with check (is_admin() or client_id = get_my_client_id());
create policy cost_records_delete on public.cost_records for delete
  using (is_admin() or client_id = get_my_client_id());

-- ===================== stock_movements =====================
alter table public.stock_movements add column if not exists client_id uuid references public.clients(id);
update public.stock_movements sm set client_id = sb.client_id
  from public.stock_batches sb where sm.batch_id = sb.id and sm.client_id is null;

create or replace function public._stock_movements_set_client_id()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.client_id is null then
    new.client_id := coalesce(
      (select sb.client_id from public.stock_batches sb where sb.id = new.batch_id),
      get_my_client_id()
    );
  end if;
  return new;
end $$;
drop trigger if exists trg_stock_movements_set_client_id on public.stock_movements;
create trigger trg_stock_movements_set_client_id
  before insert on public.stock_movements
  for each row execute function public._stock_movements_set_client_id();

drop policy if exists allow_all_insert on public.stock_movements;
drop policy if exists allow_insert_stock_movements on public.stock_movements;
drop policy if exists allow_all_select on public.stock_movements;
drop policy if exists allow_read_stock_movements on public.stock_movements;
drop policy if exists allow_all_update on public.stock_movements;
create policy stock_movements_select on public.stock_movements for select
  using (is_admin() or client_id = get_my_client_id());
create policy stock_movements_insert on public.stock_movements for insert
  with check (is_admin() or client_id = get_my_client_id());
create policy stock_movements_update on public.stock_movements for update
  using (is_admin() or client_id = get_my_client_id())
  with check (is_admin() or client_id = get_my_client_id());

-- ===================== sales (ja tem client_id + policies sales_*; remove so as permissivas) =====================
drop policy if exists allow_all_insert on public.sales;
drop policy if exists allow_all_select on public.sales;
drop policy if exists allow_all_update on public.sales;
