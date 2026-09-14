-- Rollback da 164. A tabela existia em produção ANTES da migration; por isso
-- o rollback NÃO a derruba — só remove o que a 164 acrescentou (índice e
-- policy). Derrubar a tabela apagaria a trilha de auditoria histórica.
BEGIN;

DROP POLICY IF EXISTS platform_jobs_log_admin_select ON public.platform_jobs_log;
DROP INDEX IF EXISTS public.idx_platform_jobs_log_job_ran;

COMMIT;
