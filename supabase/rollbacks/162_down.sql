-- =============================================================================
-- Rollback da Migration 162 — A-1 role de contador + A-2 intake
-- =============================================================================
-- ATENÇÃO: reverter a role derruba qualquer contador já cadastrado. A constraint
-- volta a recusar 'accountant', então clientes com essa role precisam ser
-- reclassificados ANTES — senão o ALTER falha por violação.
--
-- A tabela de intake é histórico de lead. Dropar perde o contexto comercial de
-- todos os cadastros feitos desde a aplicação.
-- =============================================================================

-- Reclassificar contadores antes de restaurar a constraint, ou o ALTER falha.
-- Descomente se for realmente reverter:
-- UPDATE public.clients SET role = 'client' WHERE role = 'accountant';

ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_role_check;
ALTER TABLE public.clients ADD CONSTRAINT clients_role_check
  CHECK (role IN ('admin', 'client', 'buyer', 'bank'));

DROP POLICY IF EXISTS onboarding_intake_insert ON public.onboarding_intake;
DROP POLICY IF EXISTS onboarding_intake_select ON public.onboarding_intake;
DROP INDEX IF EXISTS public.idx_onboarding_intake_perfil;
DROP INDEX IF EXISTS public.idx_onboarding_intake_client;
DROP TABLE IF EXISTS public.onboarding_intake;
