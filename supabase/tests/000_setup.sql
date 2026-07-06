-- =============================================================================
-- 000_setup.sql · Sprint L · Anti-regressão de triggers críticos
-- =============================================================================
-- Inicializa pgTAP (idempotente). Cada arquivo de teste já abre BEGIN e dá
-- ROLLBACK ao final — este setup NÃO deve ser embutido em transaction porque
-- a CREATE EXTENSION precisa ficar persistida entre testes na mesma sessão.
--
-- Pré-requisitos:
--   - Postgres 14+ (Supabase atende)
--   - role rodando os testes tem CREATEROLE/SUPERUSER (postgres ou
--     supabase_admin no managed). Em CI: usa connection string com
--     SUPABASE_DB_URL_SERVICE.
--
-- pgTAP docs: https://pgtap.org/documentation.html
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgtap;

-- =============================================================================
-- Helper: garante um client + property + animal de teste isolados.
-- Retorna IDs por OUT params. Os testes embrulham essa fixture em BEGIN/ROLLBACK
-- para não persistir dados.
-- =============================================================================
CREATE OR REPLACE FUNCTION public._test_fixture_client_animal(
  OUT v_client_id   uuid,
  OUT v_property_id uuid,
  OUT v_animal_id   uuid,
  OUT v_lot_id      uuid
)
LANGUAGE plpgsql
AS $$
BEGIN
  v_client_id   := gen_random_uuid();
  v_property_id := gen_random_uuid();
  v_animal_id   := gen_random_uuid();
  v_lot_id      := gen_random_uuid();

  INSERT INTO public.clients (id, name, email, role, plan, tax_regime, funrural_rate)
  VALUES (v_client_id, 'TEST_CLIENT_'||substring(v_client_id::text,1,8),
          'test_'||substring(v_client_id::text,1,8)||'@test.local',
          'client', 'starter', 'pf', 0.0163);

  INSERT INTO public.properties (id, client_id, name, city, state)
  VALUES (v_property_id, v_client_id, 'TEST_PROP', 'TestCity', 'TS');

  INSERT INTO public.animals
    (id, client_id, internal_code, sex, breed, status, current_property_id, birth_date)
  VALUES
    (v_animal_id, v_client_id, 'TEST-'||substring(v_animal_id::text,1,6),
     'M', 'Nelore', 'Ativo', v_property_id, '2024-01-01');

  INSERT INTO public.lots
    (id, client_id, property_id, name, status, start_date)
  VALUES
    (v_lot_id, v_client_id, v_property_id, 'TEST_LOT_'||substring(v_lot_id::text,1,8),
     'active', CURRENT_DATE);
END;
$$;

COMMENT ON FUNCTION public._test_fixture_client_animal() IS
  'Sprint L · Fixture de cliente+propriedade+animal+lote para suíte pgTAP. Sempre rodar dentro de BEGIN/ROLLBACK.';
