-- =============================================================================
-- Migration 001 — Multi-cliente e completude de propriedades
-- Agraas · Sprint 1
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabela de clientes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  email      text,
  created_at timestamptz DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. Completar tabela properties
--    Colunas que o frontend já usa mas que ainda não existem na tabela
-- -----------------------------------------------------------------------------
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS client_id      uuid        REFERENCES clients(id),
  ADD COLUMN IF NOT EXISTS code           text,
  ADD COLUMN IF NOT EXISTS region         text,
  ADD COLUMN IF NOT EXISTS state          text,
  ADD COLUMN IF NOT EXISTS animals_count  integer     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lots_count     integer     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status         text        DEFAULT 'Ativa',
  ADD COLUMN IF NOT EXISTS profile        text,
  ADD COLUMN IF NOT EXISTS x              numeric,
  ADD COLUMN IF NOT EXISTS y              numeric,
  ADD COLUMN IF NOT EXISTS area_hectares  numeric;

-- -----------------------------------------------------------------------------
-- 3. Adicionar client_id em animals
-- -----------------------------------------------------------------------------
ALTER TABLE animals
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id);

-- -----------------------------------------------------------------------------
-- 4. Adicionar client_id em agraas_master_passport_cache
-- -----------------------------------------------------------------------------
ALTER TABLE agraas_master_passport_cache
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id);

-- -----------------------------------------------------------------------------
-- 5. Índices para performance em queries multi-tenant
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_properties_client_id
  ON properties(client_id);

CREATE INDEX IF NOT EXISTS idx_animals_client_id
  ON animals(client_id);

CREATE INDEX IF NOT EXISTS idx_animals_current_property
  ON animals(current_property_id);

CREATE INDEX IF NOT EXISTS idx_passport_cache_client_id
  ON agraas_master_passport_cache(client_id);

-- -----------------------------------------------------------------------------
-- 6. Clientes de teste
-- -----------------------------------------------------------------------------
INSERT INTO clients (id, name, email) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Pedro', 'pedro@multbovinos.com.br'),
  ('00000000-0000-0000-0001-000000000002', 'Ico',   'ico@multbovinos.com.br')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. Propriedades de teste
--    Pedro → 3 fazendas (GO, MT, MG)
--    Ico   → 3 fazendas (SP, PA, PR)
-- -----------------------------------------------------------------------------
INSERT INTO properties (id, name, code, region, state, animals_count, lots_count, status, profile, x, y, client_id) VALUES
  (
    '00000000-0000-0001-0000-000000000001',
    'Fazenda Santa Helena', 'PROP-001', 'Centro-Oeste', 'GO',
    248, 12, 'Ativa', 'Confinamento e cria', 360, 255,
    '00000000-0000-0000-0001-000000000001'
  ),
  (
    '00000000-0000-0001-0000-000000000002',
    'Estância Boa Vista', 'PROP-002', 'Centro-Oeste', 'MT',
    186, 9, 'Ativa', 'Recria e engorda', 285, 210,
    '00000000-0000-0000-0001-000000000001'
  ),
  (
    '00000000-0000-0001-0000-000000000003',
    'Fazenda Horizonte', 'PROP-003', 'Sudeste', 'MG',
    132, 6, 'Monitorada', 'Ciclo completo', 450, 305,
    '00000000-0000-0000-0001-000000000001'
  ),
  (
    '00000000-0000-0001-0000-000000000004',
    'Agropecuária Vale Verde', 'PROP-004', 'Sudeste', 'SP',
    94, 4, 'Ativa', 'Produção premium', 420, 350,
    '00000000-0000-0000-0001-000000000002'
  ),
  (
    '00000000-0000-0001-0000-000000000005',
    'Fazenda Novo Horizonte', 'PROP-005', 'Norte', 'PA',
    168, 7, 'Expansão', 'Expansão territorial', 345, 125,
    '00000000-0000-0000-0001-000000000002'
  ),
  (
    '00000000-0000-0001-0000-000000000006',
    'Reserva Serra Dourada', 'PROP-006', 'Sul', 'PR',
    116, 5, 'Monitorada', 'Integração e rastreio premium', 395, 420,
    '00000000-0000-0000-0001-000000000002'
  )
ON CONFLICT (id) DO NOTHING;
