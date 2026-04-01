-- Migration 057: Carência em vacinas de aves + seed halal/sif nos lotes de Lucas

-- ── Novas colunas em poultry_batch_events ────────────────────────────────────

ALTER TABLE poultry_batch_events
  ADD COLUMN IF NOT EXISTS withdrawal_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS withdrawal_date date;

-- ── Trigger: calcula withdrawal_date automaticamente para vacinas ─────────────

CREATE OR REPLACE FUNCTION trg_calc_poultry_withdrawal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.event_type = 'vacina' AND NEW.withdrawal_days > 0 THEN
    NEW.withdrawal_date := NEW.date + NEW.withdrawal_days;
  ELSE
    NEW.withdrawal_date := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pbe_withdrawal
  BEFORE INSERT OR UPDATE ON poultry_batch_events
  FOR EACH ROW EXECUTE FUNCTION trg_calc_poultry_withdrawal();

DO $$ BEGIN
  RAISE NOTICE 'Migration 057 — colunas withdrawal_days/withdrawal_date adicionadas + trigger de cálculo';
END $$;

-- ── Seed: atualiza eventos de vacina existentes com withdrawal_days reais ─────

DO $$
DECLARE
  v_client_id uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_updated   int;
BEGIN
  -- Atualiza todos os eventos de vacina de lotes de Lucas com 21 dias de carência
  -- O trigger trg_pbe_withdrawal calculará withdrawal_date automaticamente
  UPDATE poultry_batch_events pbe
     SET withdrawal_days = 21
    FROM poultry_batches pb
   WHERE pbe.batch_id = pb.id
     AND pb.client_id = v_client_id
     AND pbe.event_type = 'vacina'
     AND pbe.withdrawal_days = 0;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE 'Seed — % eventos de vacina atualizados com withdrawal_days = 21', v_updated;
END $$;

-- ── Seed: marca Halal + SIF nos lotes ativos de Lucas ────────────────────────

DO $$
DECLARE
  v_client_id uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_batch     record;
  v_idx       int := 0;
BEGIN
  FOR v_batch IN
    SELECT id, batch_code
      FROM poultry_batches
     WHERE client_id = v_client_id
       AND status != 'abatido'
     ORDER BY housing_date DESC
     LIMIT 2
  LOOP
    v_idx := v_idx + 1;
    UPDATE poultry_batches
       SET halal_certified = true,
           sif_certified   = true,
           updated_at      = now()
     WHERE id = v_batch.id;
    RAISE NOTICE 'Seed — lote % marcado como Halal + SIF', v_batch.batch_code;
  END LOOP;

  IF v_idx = 0 THEN
    RAISE NOTICE 'Seed — nenhum lote ativo encontrado para Lucas';
  END IF;
END $$;
