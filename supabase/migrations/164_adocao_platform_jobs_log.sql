-- ============================================================================
-- 164 · Adoção de platform_jobs_log no versionamento
-- ============================================================================
-- DOC-05 (raio-x 14/09/2026): a tabela é usada por 8 rotas (self-heal, crons,
-- digest, reset-cliente, alterar_role) como trilha de auditoria, mas não
-- existe em nenhuma migration — nasceu direto no dashboard. Esta migration
-- é IDEMPOTENTE e INTROSPECTIVA: cria se não existir, acrescenta colunas que
-- faltem, e nunca altera o que já existe.
--
-- Shape esperado pelos call sites: job_name text, status text, details jsonb,
-- errors jsonb (opcional), ran_at timestamptz default now().
-- NÃO APLICAR sem ordem expressa do Lucas. Rollback: 164_down.sql (no-op se a
-- tabela já existia antes — ver comentário lá).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.platform_jobs_log (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name  text NOT NULL,
  status    text NOT NULL DEFAULT 'ok',
  details   jsonb,
  errors    jsonb,
  ran_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_jobs_log
  ADD COLUMN IF NOT EXISTS details jsonb,
  ADD COLUMN IF NOT EXISTS errors  jsonb,
  ADD COLUMN IF NOT EXISTS ran_at  timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_platform_jobs_log_job_ran
  ON public.platform_jobs_log (job_name, ran_at DESC);

-- Trilha interna: só service_role escreve; admin lê em /admin/saude.
ALTER TABLE public.platform_jobs_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_jobs_log_admin_select ON public.platform_jobs_log;
CREATE POLICY platform_jobs_log_admin_select
  ON public.platform_jobs_log FOR SELECT
  USING (public.is_admin());

COMMENT ON TABLE public.platform_jobs_log IS
  'Trilha de jobs e ações administrativas. Adotada no versionamento pela 164 (14/09/2026); antes existia só em produção.';

COMMIT;
