-- Migration 040: Corrige RLS em animal_rfids com políticas baseadas em JOIN com animals

-- Remove políticas abertas existentes
DROP POLICY IF EXISTS allow_all_select ON animal_rfids;
DROP POLICY IF EXISTS allow_all_insert ON animal_rfids;
DROP POLICY IF EXISTS allow_all_update ON animal_rfids;

-- SELECT: apenas RFIDs de animais do próprio cliente
CREATE POLICY animal_rfids_select ON animal_rfids
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM animals
      WHERE animals.id = animal_rfids.animal_id
        AND (animals.client_id = get_my_client_id() OR is_admin())
    )
  );

-- INSERT: apenas para animais do próprio cliente
CREATE POLICY animal_rfids_insert ON animal_rfids
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM animals
      WHERE animals.id = animal_rfids.animal_id
        AND (animals.client_id = get_my_client_id() OR is_admin())
    )
  );

-- UPDATE: apenas RFIDs de animais do próprio cliente
CREATE POLICY animal_rfids_update ON animal_rfids
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM animals
      WHERE animals.id = animal_rfids.animal_id
        AND (animals.client_id = get_my_client_id() OR is_admin())
    )
  );

-- DELETE: apenas RFIDs de animais do próprio cliente
CREATE POLICY animal_rfids_delete ON animal_rfids
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM animals
      WHERE animals.id = animal_rfids.animal_id
        AND (animals.client_id = get_my_client_id() OR is_admin())
    )
  );
