-- Migration 118: mentor_assignment FSJBE espelho read-only
--
-- Vincula a conta compartilhada mentoria.fsjbe@agraas.com.br (criada na
-- FASE 5, migration 117) ao FSJBE como mentor_externo.
--
-- Renata + César logam nessa conta compartilhada. As 18 policies SELECT
-- mentor_externo da migration 116 entram em ação: leitura cross-tenant
-- da FSJBE, ZERO escrita por design.

BEGIN;

INSERT INTO public.mentor_assignments (user_id, client_id, granted_by, notes)
VALUES (
  '36628211-da18-408b-9f98-a318a47715bd',  -- mentoria.fsjbe@agraas.com.br
  '00000000-0000-0000-0003-000000000001',  -- FSJBE (Fazenda São João da Boa Esperança)
  '816a377b-1336-4c10-b4fc-35b675fe4596',  -- Lucas Ferreira (admin)
  'Mentoria quinzenal IZ-SP / NeuTroPec — perfil ESPELHO read-only da FSJBE. Renata e César logam compartilhado nesta conta.'
);

COMMIT;
