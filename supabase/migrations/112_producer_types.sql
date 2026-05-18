-- Migration 112: producer_types ENUM + N:N + seed PT-BR
--
-- Tipos zootécnicos configuráveis por cliente. Decisão arquitetural 17/05/2026:
-- não é só "produtor" — Agraas atende cria, recria/engorda, confinamento,
-- ciclo completo E compradores (frigorífico, retalhista, exportador).
--
-- Modelo:
--   producer_types         — catálogo público de 5 tipos (read all)
--   client_producer_types  — vinculação N:N cliente↔tipo, com is_primary
--
-- Seed inicial:
--   5 producer_types em PT-BR
--   FSJBE vinculado como 'cria' is_primary=true

BEGIN;

-- ── ENUM ─────────────────────────────────────────────────────────────
CREATE TYPE producer_type_enum AS ENUM (
  'cria',
  'recria_engorda',
  'confinamento',
  'ponta_compradora',
  'full_cycle'
);

-- ── Catálogo de tipos ────────────────────────────────────────────────
CREATE TABLE public.producer_types (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code         producer_type_enum NOT NULL UNIQUE,
  name         text NOT NULL,
  description  text,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.producer_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY producer_types_select_all ON public.producer_types
  FOR SELECT USING (true);

-- Apenas admin escreve no catálogo (curado)
CREATE POLICY producer_types_admin_write ON public.producer_types
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ── Vinculação N:N cliente ↔ tipo ────────────────────────────────────
CREATE TABLE public.client_producer_types (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  producer_type_id uuid NOT NULL REFERENCES public.producer_types(id) ON DELETE RESTRICT,
  is_primary       boolean NOT NULL DEFAULT false,
  started_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, producer_type_id)
);

CREATE INDEX idx_cpt_client ON public.client_producer_types(client_id);
CREATE INDEX idx_cpt_type   ON public.client_producer_types(producer_type_id);

ALTER TABLE public.client_producer_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY cpt_select ON public.client_producer_types
  FOR SELECT USING (
    is_admin()
    OR client_id = get_my_client_id()
    OR (is_mentor_externo() AND mentor_has_access_to_client(client_id))
  );

CREATE POLICY cpt_insert ON public.client_producer_types
  FOR INSERT WITH CHECK (is_admin() OR client_id = get_my_client_id());

CREATE POLICY cpt_update ON public.client_producer_types
  FOR UPDATE USING (is_admin() OR client_id = get_my_client_id())
  WITH CHECK (is_admin() OR client_id = get_my_client_id());

CREATE POLICY cpt_delete ON public.client_producer_types
  FOR DELETE USING (is_admin() OR client_id = get_my_client_id());

-- ── Seed PT-BR ───────────────────────────────────────────────────────
INSERT INTO public.producer_types (code, name, description) VALUES
  ('cria',             'Cria',             'Cobertura, parto, desmame de bezerros'),
  ('recria_engorda',   'Recria/Engorda',   'Recebe desmamados, vende prontos pra abate'),
  ('confinamento',     'Confinamento',     'Terminação intensiva em baia'),
  ('ponta_compradora', 'Comprador',        'Frigorífico, retalhista, exportador'),
  ('full_cycle',       'Ciclo Completo',   'Cria + recria + engorda integrados');

-- ── Vincula FSJBE como 'cria' is_primary=true ────────────────────────
INSERT INTO public.client_producer_types (client_id, producer_type_id, is_primary)
SELECT
  c.id,
  pt.id,
  true
FROM public.clients c, public.producer_types pt
WHERE c.id = '00000000-0000-0000-0003-000000000001'
  AND pt.code = 'cria';

COMMIT;
