-- =============================================================================
-- Migration 162 — A-1: role de contador + A-2: intake de cadastro
-- =============================================================================
-- *** NÃO APLICADA. Escrita em 08/09/2026, aguardando janela operacional. ***
--
-- ── A-1: o contador não existe no banco ─────────────────────────────────────
--
-- Diagnóstico (08/09/2026): o canal comercial nº 1 do plano de 90 dias é o
-- contador rural, e o gate d30 (25/09) cobra "3 contadores treinados". Mas:
--
--   1. `clients_role_check` aceita só ('admin','client','buyer','bank').
--      A migration 126 foi a última a tocar a constraint, e NÃO incluiu
--      'accountant'. Qualquer INSERT ou UPDATE com essa role é REJEITADO.
--   2. `lib/persona-themes.ts` mapeia "accountant" -> persona contador, ou seja,
--      o código espera um valor que o banco recusa.
--   3. `app/contador/page.tsx` admite no próprio comentário: "aceita admin para
--      demo + contador quando a role existir no banco".
--
--   Consequência: NUNCA existiu um contador de verdade. As telas de contador só
--   foram vistas por admin em modo "viewing as". Sem esta migration, o teste de
--   canal do d60 não pode rodar nem manualmente.
--
-- ── A-2: o cadastro coleta e descarta ───────────────────────────────────────
--
-- O passo 2 do cadastro pede nome da fazenda, estado, tamanho do rebanho,
-- espécie e razão social. O INSERT em `clients` grava só nome, e-mail e role —
-- todo o resto é perdido. O comercial fica sem o contexto do lead.
--
-- Tabela dedicada em vez de colunas em `clients`: é dado de intake (o que a
-- pessoa DISSE ao se cadastrar), não estado do cliente. Misturar os dois faria
-- o dado declarado competir com o dado real da operação depois.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) Role de contador
-- -----------------------------------------------------------------------------
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_role_check;
ALTER TABLE public.clients ADD CONSTRAINT clients_role_check
  CHECK (role IN ('admin', 'client', 'buyer', 'bank', 'accountant'));

COMMENT ON COLUMN public.clients.role IS
  'Persona do cliente. admin | client (produtor) | buyer (frigorifico) | bank | accountant (contador). Mapeada para a persona visual em lib/persona-themes.ts roleToPersona().';

-- -----------------------------------------------------------------------------
-- B) Intake do cadastro
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.onboarding_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- O que a pessoa escolheu como perfil na tela (fazendeiro, contador, ...).
  -- Guardado como texto livre de propósito: é a resposta dela, não a nossa
  -- taxonomia. A role derivada fica em clients.role.
  perfil_declarado text,

  -- Passo 2 — produtor
  farm_name text,
  uf text,
  rebanho_faixa text,
  especie text,

  -- Passo 2 — demais perfis
  company_name text,
  notes text,

  -- Contexto de aquisição, útil para o comercial e para o teste de canal.
  telefone text,
  origem text,

  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.onboarding_intake IS
  'O que o lead declarou no cadastro. Dado de intake, nao estado do cliente: nao usar como fonte de verdade da operacao. Criada no A-2 (08/09/2026) porque o cadastro coletava esses campos e os descartava.';

CREATE INDEX IF NOT EXISTS idx_onboarding_intake_client
  ON public.onboarding_intake (client_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_intake_perfil
  ON public.onboarding_intake (perfil_declarado, created_at DESC);

-- RLS: toda tabela operacional precisa de client_id + política (CLAUDE.md).
ALTER TABLE public.onboarding_intake ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS onboarding_intake_select ON public.onboarding_intake;
DROP POLICY IF EXISTS onboarding_intake_insert ON public.onboarding_intake;

CREATE POLICY onboarding_intake_select ON public.onboarding_intake FOR SELECT
  USING (client_id = get_my_client_id() OR is_admin());

-- Só o próprio cliente insere o próprio intake, no momento do cadastro.
CREATE POLICY onboarding_intake_insert ON public.onboarding_intake FOR INSERT
  WITH CHECK (client_id = get_my_client_id() OR is_admin());

-- Sem UPDATE nem DELETE: intake é registro do que foi dito na hora. Corrigir
-- depois falsificaria a trilha. O dado corrente do cliente vive em `clients`
-- e nas tabelas de operação.
