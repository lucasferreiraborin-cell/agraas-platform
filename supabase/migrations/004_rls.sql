-- Migration 004: Ativa Row Level Security em todas as tabelas principais
-- Policy: cada usuário autenticado acessa apenas os dados do seu client

-- Helper: retorna o client_id do usuário logado
CREATE OR REPLACE FUNCTION get_my_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM clients WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- ANIMALS
-- ============================================================
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "animals: usuário acessa apenas seus animais"
ON animals
FOR ALL
USING (client_id = get_my_client_id());

-- ============================================================
-- PROPERTIES
-- ============================================================
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties: usuário acessa apenas suas propriedades"
ON properties
FOR ALL
USING (client_id = get_my_client_id());

-- ============================================================
-- EVENTS
-- ============================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events: usuário acessa eventos dos seus animais"
ON events
FOR ALL
USING (
  animal_id IN (
    SELECT id FROM animals WHERE client_id = get_my_client_id()
  )
);

-- ============================================================
-- AGRAAS_MASTER_PASSPORT_CACHE
-- ============================================================
ALTER TABLE agraas_master_passport_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "passport: usuário acessa passaportes dos seus animais"
ON agraas_master_passport_cache
FOR ALL
USING (client_id = get_my_client_id());

-- ============================================================
-- APPLICATIONS (aplicações sanitárias)
-- ============================================================
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applications: usuário acessa aplicações dos seus animais"
ON applications
FOR ALL
USING (
  animal_id IN (
    SELECT id FROM animals WHERE client_id = get_my_client_id()
  )
);

-- ============================================================
-- WEIGHTS (pesagens)
-- ============================================================
ALTER TABLE weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weights: usuário acessa pesagens dos seus animais"
ON weights
FOR ALL
USING (
  animal_id IN (
    SELECT id FROM animals WHERE client_id = get_my_client_id()
  )
);

-- ============================================================
-- ANIMAL_MOVEMENTS (movimentações)
-- ============================================================
ALTER TABLE animal_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movements: usuário acessa movimentos dos seus animais"
ON animal_movements
FOR ALL
USING (
  animal_id IN (
    SELECT id FROM animals WHERE client_id = get_my_client_id()
  )
);

-- ============================================================
-- ANIMAL_CERTIFICATIONS (certificações)
-- ============================================================
ALTER TABLE animal_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "certifications: usuário acessa certificações dos seus animais"
ON animal_certifications
FOR ALL
USING (
  animal_id IN (
    SELECT id FROM animals WHERE client_id = get_my_client_id()
  )
);
