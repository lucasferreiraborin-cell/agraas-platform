-- ============================================================================
-- 169 · Fecha o furo de isolamento via users_profile (15 policies legadas)
-- ============================================================================
-- Achado do security-rls-auditor, 16/11/2026, lido nas policies vivas do banco
-- (pg_policies) — não explorado, mas a leitura é conclusiva:
--
--   15 policies `*_same_property` em batch_lots, batch_lot_animals,
--   animal_seals, animal_scores e slaughter_records liberam SELECT / INSERT /
--   UPDATE por `users_profile.property_id`. A policy `users_profile_insert_own`
--   só exige auth_user_id = auth.uid() e deixa property_id livre; anon e
--   authenticated têm INSERT/UPDATE na tabela. Policies permissivas somam com
--   OR, então qualquer conta nova pode inserir uma linha em users_profile
--   apontando pra propriedade de outro cliente e, a partir daí, ler e ALTERAR
--   score e registro de abate desse cliente. O score adulterado aparece no
--   passaporte, no dossiê do banco e na tela do frigorífico.
--
--   users_profile não é usada em app/ nem lib/ (1 linha legada). As policies
--   por client_id (`*_client_isolation`) já cobrem o acesso legítimo às 5
--   tabelas — o DO abaixo aborta se alguma ficasse sem policy.
--
-- Fix: dropar as 15 policies e fechar a escrita em users_profile (anon perde
-- tudo; authenticated fica só com SELECT da própria linha).
--
-- Fora deste arquivo, de propósito: revogar EXECUTE de anon nas funções
-- SECURITY DEFINER (advisor 0028). is_admin() e get_my_client_id() são
-- chamadas por policies avaliadas como anon em páginas públicas, e trigger
-- functions não são chamáveis via RPC — revogar sem teste em branch pode
-- quebrar leitura pública ou escrita de usuário. Migration própria, testada.
--
-- Idempotente (IF EXISTS). NÃO APLICAR sem ordem expressa do Lucas (D-10).
-- Rollback: supabase/rollbacks/169_down.sql
-- ============================================================================

BEGIN;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['animal_scores','animal_seals','batch_lot_animals','batch_lots','slaughter_records'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
       WHERE schemaname = 'public' AND tablename = t
         AND policyname NOT LIKE '%same_property%'
    ) THEN
      RAISE EXCEPTION '169: % ficaria sem nenhuma policy depois do drop — abortando', t;
    END IF;
  END LOOP;
END $$;

DROP POLICY IF EXISTS animal_scores_insert_same_property     ON public.animal_scores;
DROP POLICY IF EXISTS animal_scores_select_same_property     ON public.animal_scores;
DROP POLICY IF EXISTS animal_scores_update_same_property     ON public.animal_scores;
DROP POLICY IF EXISTS animal_seals_insert_same_property      ON public.animal_seals;
DROP POLICY IF EXISTS animal_seals_select_same_property      ON public.animal_seals;
DROP POLICY IF EXISTS animal_seals_update_same_property      ON public.animal_seals;
DROP POLICY IF EXISTS batch_lot_animals_insert_same_property ON public.batch_lot_animals;
DROP POLICY IF EXISTS batch_lot_animals_select_same_property ON public.batch_lot_animals;
DROP POLICY IF EXISTS batch_lot_animals_update_same_property ON public.batch_lot_animals;
DROP POLICY IF EXISTS batch_lots_insert_same_property        ON public.batch_lots;
DROP POLICY IF EXISTS batch_lots_select_same_property        ON public.batch_lots;
DROP POLICY IF EXISTS batch_lots_update_same_property        ON public.batch_lots;
DROP POLICY IF EXISTS slaughter_records_insert_same_property ON public.slaughter_records;
DROP POLICY IF EXISTS slaughter_records_select_same_property ON public.slaughter_records;
DROP POLICY IF EXISTS slaughter_records_update_same_property ON public.slaughter_records;

DROP POLICY IF EXISTS users_profile_insert_own ON public.users_profile;
DROP POLICY IF EXISTS users_profile_update_own ON public.users_profile;

REVOKE ALL ON TABLE public.users_profile FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.users_profile FROM authenticated;

COMMIT;
