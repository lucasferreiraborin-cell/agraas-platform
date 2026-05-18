-- Rollback migration 117
--
-- Reverte apenas o link auth_user_id. As 3 contas auth.users permanecem
-- (criadas via API admin, não via migration) — pra deletar, use o Dashboard
-- ou Auth Admin API DELETE /admin/users/{id}.

BEGIN;

UPDATE public.clients
SET auth_user_id = NULL
WHERE id IN (
  '00000000-0000-0000-0099-000000000001',
  '00000000-0000-0000-0099-000000000002'
);

COMMIT;
