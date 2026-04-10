-- Migration 086: Cleanup propriedades para demo PIF

DO $$
DECLARE
  v_lucas uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_santa_cruz uuid := '00000000-0000-0002-0001-000000000001'; -- Santa Cruz Lucas
BEGIN
  SET LOCAL session_replication_role = 'replica';

  -- ═══ 1. Migra animais da duplicata (São João do Morro Alto Lucas) → Santa Cruz
  UPDATE animals
     SET current_property_id = v_santa_cruz
   WHERE current_property_id = '94055b4e-fa0d-4636-9098-1c5b31e53a8a';

  -- ═══ 2. Deleta duplicatas Lucas (sem code) ═══════════════════════════════
  -- "Fazenda São João do Morro Alto" duplicata Lucas (sem code)
  DELETE FROM properties
   WHERE id = '94055b4e-fa0d-4636-9098-1c5b31e53a8a';

  -- "Fazenda Santa Helena" duplicata Lucas (sem code)
  DELETE FROM properties
   WHERE id = '96b0d027-31a3-44a0-9571-3458b547ce0d';

  -- ═══ 3. Preenche campos vazios em propriedades sem code/region/profile ═══
  UPDATE properties
     SET code    = 'PROP-LBV-01',
         region  = 'Centro-Oeste',
         profile = 'Cria e recria — Nelore | Boa Vista, RR'
   WHERE id = 'ed4794b2-ccb9-49a1-a25c-5c981a81dd6a';

  -- ═══ 4. FSJBE como cliente âncora — perfil piloto ═════════════════════════
  UPDATE properties
     SET profile = 'Piloto Agraas · 2.300 cabeças em processo de onboarding · Jandaia, GO'
   WHERE name = 'Fazenda São João da Boa Esperança'
     AND client_id = '00000000-0000-0000-0003-000000000001';

  -- ═══ 5. Refina perfis genéricos ══════════════════════════════════════════
  UPDATE properties SET profile = 'Engorda premium e exportação halal · Goiás'
   WHERE id = v_santa_cruz AND (profile IS NULL OR profile = 'Engorda premium e exportação halal');

  UPDATE properties SET profile = 'Recria e engorda — ciclo semi-intensivo · MS'
   WHERE id = '00000000-0000-0002-0001-000000000002' AND profile LIKE 'Recria%';

  SET LOCAL session_replication_role = DEFAULT;
END $$;
