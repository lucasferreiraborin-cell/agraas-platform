-- ============================================================
-- Migration 157 — Módulo GTA (Guia de Trânsito Animal)
-- 2026-07 · Wedge fiscal/rastreio bovino
--
-- CONTEXTO METODOLÓGICO:
-- A GTA (Guia de Trânsito Animal) é o documento oficial obrigatório
-- para qualquer deslocamento de animais entre propriedades, para abate,
-- exposições ou eventos (IN MAPA nº 44/2007 e normas estaduais das ADAGRIs/
-- IMAs/IDARONs). Ela registra ORIGEM → DESTINO, finalidade, espécie,
-- quantidade, datas de emissão e validade — sendo o elo de rastreabilidade
-- sanitária entre o rebanho e a defesa agropecuária estadual.
--
-- Até aqui, "GTA" na Agraas existia apenas como um selo/certificação
-- (animal_certifications com nome contendo "GTA"). Esta migration cria o
-- EVENTO DE TRÂNSITO real como entidade de primeira classe, permitindo:
--   · registrar guias com número/série, origem (propriedade cadastrada),
--     destino (nome + UF), finalidade e quantidade;
--   · controlar o ciclo de vida (emitida → em_transito → recebida / vencida
--     / cancelada);
--   · vincular opcionalmente a um lote (lots) para consolidar embarques.
--
-- DECISÃO DE RLS (segue o padrão da 133/fiscal_invoices — a GTA é um
-- documento fiscal-sanitário, mesmo enquadramento de posse):
--   · SELECT/INSERT/UPDATE → dono (client_id = get_my_client_id()) ou admin.
--   · DELETE → somente admin. GTA é documento legal; o produtor "cancela"
--     via status = 'cancelada' (soft-delete), preservando a trilha de
--     auditoria. Hard-delete fica restrito a operação administrativa.
--
-- IDEMPOTÊNCIA: create table if not exists + drop policy if exists +
-- create or replace function/trigger. Roda 2x sem erro.
--
-- SEED: NENHUM. A tabela nasce vazia (regra do Lucas — nada de dado
-- fictício). O empty-state honesto da UI /gta cobre o estado inicial.
-- ============================================================

-- ── Tabela principal ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gta (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Multi-tenant: toda linha pertence a um cliente. NOT NULL + RLS abaixo.
  client_id          uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Identificação da guia (número/série impressos na GTA emitida pela ADAGRI).
  numero             text,
  serie              text,

  -- Finalidade do trânsito — enumeração fechada conforme uso corrente das GTAs.
  finalidade         text CHECK (finalidade IN ('venda','transferencia','abate','exposicao','outro')),

  -- Origem: propriedade CADASTRADA na Agraas (rastreabilidade interna).
  -- ON DELETE SET NULL: apagar a propriedade não deve derrubar o histórico da guia.
  origem_property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,

  -- Destino: pode ser propriedade externa/frigorífico não cadastrado → texto livre + UF.
  destino_nome       text,
  destino_uf         text,

  -- Espécie (bovino por padrão — foco atual da plataforma).
  especie            text DEFAULT 'bovino',
  quantidade         integer,

  -- Datas oficiais da guia.
  data_emissao       date,
  data_validade      date,

  -- Ciclo de vida do trânsito.
  status             text CHECK (status IN ('emitida','em_transito','recebida','vencida','cancelada'))
                          DEFAULT 'emitida',

  -- Vínculo opcional a um lote (consolidação de embarque). ON DELETE SET NULL
  -- preserva a guia mesmo que o lote seja removido.
  lot_id             uuid REFERENCES public.lots(id) ON DELETE SET NULL,

  notes              text,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

COMMENT ON TABLE public.gta IS
  'Guia de Trânsito Animal (GTA) — evento real de trânsito: origem→destino, número/série, finalidade, quantidade, datas e ciclo de vida. Substitui o antigo "GTA" que era apenas selo/certificação. Base IN MAPA 44/2007 + normas estaduais de defesa agropecuária.';
COMMENT ON COLUMN public.gta.finalidade IS 'venda | transferencia | abate | exposicao | outro';
COMMENT ON COLUMN public.gta.status IS 'emitida | em_transito | recebida | vencida | cancelada (produtor cancela via status; hard-delete só admin).';
COMMENT ON COLUMN public.gta.origem_property_id IS 'Propriedade de origem cadastrada na Agraas (properties). Destino externo fica em destino_nome/destino_uf.';

-- ── Índices para queries conhecidas ───────────────────────────────────────────
-- (client_id): filtro base de todo tenant (listagem principal).
CREATE INDEX IF NOT EXISTS idx_gta_client        ON public.gta (client_id);
-- (origem_property_id): join/agrupamento por propriedade de origem.
CREATE INDEX IF NOT EXISTS idx_gta_origem        ON public.gta (origem_property_id);
-- (data_validade): KPIs de "vencendo em 30d" e "vencidas".
CREATE INDEX IF NOT EXISTS idx_gta_data_validade ON public.gta (data_validade);

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE public.gta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gta_select ON public.gta;
CREATE POLICY gta_select ON public.gta
  FOR SELECT
  TO authenticated
  USING (client_id = get_my_client_id() OR is_admin());

DROP POLICY IF EXISTS gta_insert ON public.gta;
CREATE POLICY gta_insert ON public.gta
  FOR INSERT
  TO authenticated
  WITH CHECK (client_id = get_my_client_id() OR is_admin());

DROP POLICY IF EXISTS gta_update ON public.gta;
CREATE POLICY gta_update ON public.gta
  FOR UPDATE
  TO authenticated
  USING (client_id = get_my_client_id() OR is_admin())
  WITH CHECK (client_id = get_my_client_id() OR is_admin());

-- DELETE restrito a admin: GTA é documento legal, produtor cancela via status.
DROP POLICY IF EXISTS gta_delete ON public.gta;
CREATE POLICY gta_delete ON public.gta
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- ── Trigger updated_at ──────────────────────────────────────────────────────────
-- Reutiliza tg_set_updated_at() (criada na migration 133). Re-declara OR REPLACE
-- para manter a migration self-contained e idempotente.
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gta_updated_at ON public.gta;
CREATE TRIGGER trg_gta_updated_at
  BEFORE UPDATE ON public.gta
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
