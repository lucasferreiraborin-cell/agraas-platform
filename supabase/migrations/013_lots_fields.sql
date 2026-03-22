-- Migration 013: Campos adicionais na tabela lots para gestão completa

ALTER TABLE lots
  ADD COLUMN IF NOT EXISTS client_id   uuid REFERENCES clients(id),
  ADD COLUMN IF NOT EXISTS objective   text,
  ADD COLUMN IF NOT EXISTS start_date  date,
  ADD COLUMN IF NOT EXISTS target_weight numeric;

-- RLS na tabela lots
ALTER TABLE lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lots_access" ON lots;
CREATE POLICY "lots_access"
ON lots FOR ALL
USING (is_admin() OR client_id = get_my_client_id());

-- RLS em animal_lot_assignments (sem client_id — acessa via lots)
ALTER TABLE animal_lot_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lot_assignments_access" ON animal_lot_assignments;
CREATE POLICY "lot_assignments_access"
ON animal_lot_assignments FOR ALL
USING (
  is_admin() OR
  lot_id IN (SELECT id FROM lots WHERE client_id = get_my_client_id())
);
