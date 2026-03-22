-- Migration 015: platform_settings para cotação + target_arrobas em properties

-- Tabela de configurações da plataforma (key/value)
CREATE TABLE IF NOT EXISTS platform_settings (
  key   text PRIMARY KEY,
  value text,
  updated_at timestamptz DEFAULT now()
);

-- Seed: cotação inicial como fallback
INSERT INTO platform_settings (key, value, updated_at)
VALUES ('cotacao_arroba', '330', now())
ON CONFLICT (key) DO NOTHING;

-- RLS: leitura pública, escrita apenas admin
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_read" ON platform_settings;
CREATE POLICY "settings_read"
ON platform_settings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "settings_write" ON platform_settings;
CREATE POLICY "settings_write"
ON platform_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM clients
    WHERE auth_user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Meta de arrobas por propriedade (editável pelo dono)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS target_arrobas numeric;
