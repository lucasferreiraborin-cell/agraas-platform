-- ── Tabela shipment_tracking ────────────────────────────────────────────────

CREATE TABLE shipment_tracking (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id            uuid        NOT NULL REFERENCES lots(id) ON DELETE CASCADE,
  client_id         uuid        REFERENCES clients(id),
  stage             TEXT        NOT NULL CHECK (stage IN (
                                  'fazenda','concentracao','transporte',
                                  'porto_origem','navio','porto_destino','entregue'
                                )),
  timestamp         timestamptz NOT NULL DEFAULT now(),
  animals_confirmed int,
  animals_lost      int         NOT NULL DEFAULT 0,
  loss_cause        text,
  location_name     text,
  location_lat      numeric(10,6),
  location_lng      numeric(10,6),
  responsible_name  text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shipment_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_own_shipment_tracking"
  ON shipment_tracking
  USING (client_id = get_my_client_id());

CREATE POLICY "client_own_insert_shipment_tracking"
  ON shipment_tracking FOR INSERT
  WITH CHECK (client_id = get_my_client_id());

-- ── Seed: 3 checkpoints para EXP-2026-SAU-001 ───────────────────────────────

DO $$
DECLARE
  v_lot_id    uuid;
  v_client_id uuid;
BEGIN
  SELECT id, client_id INTO v_lot_id, v_client_id
  FROM lots
  WHERE name = 'EXP-2026-SAU-001'
  LIMIT 1;

  IF v_lot_id IS NULL THEN
    RAISE NOTICE 'Lote EXP-2026-SAU-001 não encontrado — seed de tracking ignorado.';
    RETURN;
  END IF;

  INSERT INTO shipment_tracking
    (lot_id, client_id, stage, timestamp, animals_confirmed, animals_lost,
     loss_cause, location_name, location_lat, location_lng, responsible_name, notes)
  VALUES
    -- 1) Fazenda — 15/03/2026
    (v_lot_id, v_client_id,
     'fazenda', '2026-03-15T08:00:00+00:00',
     500, 0, NULL,
     'Fazenda São João da Boa Esperança', -16.4000, -49.2500,
     'Paulo Borin',
     'Embarque inicial. Todos os animais conferidos e identificados.'),

    -- 2) Porto de origem — 01/04/2026
    (v_lot_id, v_client_id,
     'porto_origem', '2026-04-01T14:00:00+00:00',
     498, 2, 'estresse no transporte',
     'Porto de Santos', -23.9618, -46.3322,
     'Paulo Borin',
     '2 animais perdidos durante o transporte rodoviário. Documentação de perda emitida.'),

    -- 3) Navio — 05/05/2026 (em trânsito no Atlântico Sul)
    (v_lot_id, v_client_id,
     'navio', '2026-05-05T00:00:00+00:00',
     498, 0, NULL,
     'Atlântico Sul', -30.000000, -20.000000,
     'Capitão Rodrigo Mendes',
     'Navio em rota normal. Animais em boas condições.');

  RAISE NOTICE 'Seed de tracking inserido para lote %', v_lot_id;
END;
$$;
