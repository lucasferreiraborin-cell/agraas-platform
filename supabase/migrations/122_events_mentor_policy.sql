-- Migration 122: events_select_mentor policy
--
-- Tabela events tinha apenas events_access (cmd ALL) com:
--   USING (is_admin OR animal_id IN (SELECT id FROM animals WHERE client_id=mine))
--
-- Mentor_externo não tem client_id próprio → subquery retorna 0 → mentor
-- vê /eventos vazio (página renderiza empty state, parece quebrada).
--
-- Adiciona SELECT-only policy pra mentor com isolamento via animals JOIN.

BEGIN;

CREATE POLICY events_select_mentor
  ON public.events
  FOR SELECT
  USING (
    is_mentor_externo() AND animal_id IN (
      SELECT id FROM public.animals WHERE mentor_has_access_to_client(client_id)
    )
  );

COMMIT;
