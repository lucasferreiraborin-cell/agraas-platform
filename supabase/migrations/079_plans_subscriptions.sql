-- Migration 079: Planos, assinaturas e billing

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. ALTER clients — plano + billing
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE clients ADD COLUMN IF NOT EXISTS plan              text NOT NULL DEFAULT 'starter';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS plan_started_at   timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_exempt    boolean NOT NULL DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS billing_email     text;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Tabela subscription_events
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS subscription_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES clients(id),
  event_type  text NOT NULL, -- created, updated, cancelled, payment_failed, payment_success
  plan        text,
  amount      numeric(10,2),
  currency    text NOT NULL DEFAULT 'BRL',
  external_id text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sub_events_client ON subscription_events(client_id, created_at DESC);

ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY sub_events_select ON subscription_events FOR SELECT USING (is_admin() OR client_id = get_my_client_id());
CREATE POLICY sub_events_insert ON subscription_events FOR INSERT WITH CHECK (is_admin());

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Seed
-- ══════════════════════════════════════════════════════════════════════════════

-- FSJBE: pilot, billing exempt
UPDATE clients SET
  plan = 'pilot',
  plan_started_at = now(),
  billing_exempt = true,
  billing_email = 'fsjdbe@gmail.com'
WHERE email = 'fsjdbe@gmail.com';

-- Lucas: enterprise
UPDATE clients SET
  plan = 'enterprise',
  plan_started_at = now(),
  billing_email = 'lucas@agraas.com.br'
WHERE email = 'lucas@agraas.com.br';
