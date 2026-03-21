-- Migration 010: Admin role para Lucas com acesso total à plataforma

-- 1. Adiciona coluna role na tabela clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'client'
  CHECK (role IN ('admin', 'client'));

-- 2. Define papéis
UPDATE clients SET role = 'admin' WHERE name = 'Lucas';
UPDATE clients SET role = 'client' WHERE name IN ('Pedro', 'Ico');

-- 3. Função helper: verifica se o usuário logado é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM clients
    WHERE auth_user_id = auth.uid() AND role = 'admin'
  );
$$;

-- 4. Atualiza get_my_client_id: admin retorna null (sinal de acesso total)
CREATE OR REPLACE FUNCTION get_my_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM clients
  WHERE auth_user_id = auth.uid() AND role = 'client'
  LIMIT 1;
$$;

-- 5. Recria policies das tabelas principais com bypass para admin
--    (mantém as pre-existentes allow_all_* intactas)

-- ANIMALS
DROP POLICY IF EXISTS "animals: usuário acessa apenas seus animais" ON animals;
CREATE POLICY "animals_access"
ON animals FOR ALL
USING (is_admin() OR client_id = get_my_client_id());

-- PROPERTIES
DROP POLICY IF EXISTS "properties: usuário acessa apenas suas propriedades" ON properties;
CREATE POLICY "properties_access"
ON properties FOR ALL
USING (is_admin() OR client_id = get_my_client_id());

-- EVENTS
DROP POLICY IF EXISTS "events: usuário acessa eventos dos seus animais" ON events;
CREATE POLICY "events_access"
ON events FOR ALL
USING (
  is_admin() OR
  animal_id IN (
    SELECT id FROM animals WHERE client_id = get_my_client_id()
  )
);

-- PASSPORT CACHE
DROP POLICY IF EXISTS "passport: usuário acessa passaportes dos seus animais" ON agraas_master_passport_cache;
CREATE POLICY "passport_access"
ON agraas_master_passport_cache FOR ALL
USING (is_admin() OR client_id = get_my_client_id());

-- APPLICATIONS
DROP POLICY IF EXISTS "applications: usuário acessa aplicações dos seus animais" ON applications;
CREATE POLICY "applications_access"
ON applications FOR ALL
USING (
  is_admin() OR
  animal_id IN (
    SELECT id FROM animals WHERE client_id = get_my_client_id()
  )
);

-- WEIGHTS
DROP POLICY IF EXISTS "weights: usuário acessa pesagens dos seus animais" ON weights;
CREATE POLICY "weights_access"
ON weights FOR ALL
USING (
  is_admin() OR
  animal_id IN (
    SELECT id FROM animals WHERE client_id = get_my_client_id()
  )
);

-- ANIMAL_MOVEMENTS
DROP POLICY IF EXISTS "movements: usuário acessa movimentos dos seus animais" ON animal_movements;
CREATE POLICY "movements_access"
ON animal_movements FOR ALL
USING (
  is_admin() OR
  animal_id IN (
    SELECT id FROM animals WHERE client_id = get_my_client_id()
  )
);

-- ANIMAL_CERTIFICATIONS
DROP POLICY IF EXISTS "certifications: usuário acessa certificações dos seus animai" ON animal_certifications;
CREATE POLICY "certifications_access"
ON animal_certifications FOR ALL
USING (
  is_admin() OR
  animal_id IN (
    SELECT id FROM animals WHERE client_id = get_my_client_id()
  )
);

-- CLIENTS
DROP POLICY IF EXISTS "clients: usuário acessa apenas seu próprio registro" ON clients;
CREATE POLICY "clients_access"
ON clients FOR ALL
USING (is_admin() OR auth_user_id = auth.uid());
