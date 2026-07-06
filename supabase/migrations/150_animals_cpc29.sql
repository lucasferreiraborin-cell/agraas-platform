-- ============================================================
-- Migration 150 — Ativos biológicos sob CPC 29 em animals
-- Sprint K · 26/06/2026
--
-- ESPEC (controladoria-fiscal + cientifico-zootecnista):
-- CPC 29 (Ativo Biológico e Produto Agrícola) exige:
--   1. Classificação contábil — circulante vs não-circulante por destinação
--   2. Método de mensuração — custo histórico OU valor justo (fair value)
--   3. Mensuração periódica do VJ usando preço de mercado observável
--
-- DECISÕES TÉCNICAS:
-- A) Mapeamento categoria → conta usa os códigos REAIS do plano de contas
--    rural (145), NÃO os códigos sugeridos na espec (que eram fictícios).
--    Plano real:
--      1.2.01.01 — Matrizes (vacas reprodutoras)        [não-circulante]
--      1.2.01.02 — Touros reprodutores                  [não-circulante]
--      1.1.06.01 — Bovinos em engorda (terminação)      [circulante]
--      1.1.06.02 — Bovinos em recria                    [circulante]
--      1.1.06.03 — Bezerros (cria)                      [circulante]
--      1.1.06    — fallback genérico ativo biológico circulante
-- B) Categorias em PT-BR com acento (vide DISTINCT category):
--    'Touro reprodutor', 'Vaca gestante', 'Vaca lactante', 'Vaca seca',
--    'Novilha', 'Novilho', 'Novilho em engorda', 'Bezerro', 'Bezerra',
--    + lowercase 'touro', 'vaca', 'bezerro' (legado, fallback)
-- C) fair_value cálculo: usa cotacao_boi_gordo de platform_settings (key/value
--    text). 1 @ = 15kg. Resultado em R$/cabeça.
-- D) NÃO faz CASCADE no chart_of_accounts pra evitar lock — apenas seta
--    o code como TEXT (resolvido pelo app/triggers em runtime).
-- ============================================================

-- A) Colunas novas em animals
ALTER TABLE animals
  ADD COLUMN IF NOT EXISTS conta_contabil text,
  ADD COLUMN IF NOT EXISTS metodo_mensuracao text DEFAULT 'custo_historico',
  ADD COLUMN IF NOT EXISTS fair_value_unit numeric(12,2),
  ADD COLUMN IF NOT EXISTS fair_value_last_calculated timestamptz;

-- CHECK separado pra não falhar se a coluna já existir com outro check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'animals_metodo_mensuracao_check'
  ) THEN
    ALTER TABLE animals
      ADD CONSTRAINT animals_metodo_mensuracao_check
      CHECK (metodo_mensuracao IN ('custo_historico','fair_value'));
  END IF;
END $$;

COMMENT ON COLUMN animals.conta_contabil IS
  'Código (chart_of_accounts.code) da conta contábil de classificação CPC 29. Setado por trigger.';
COMMENT ON COLUMN animals.metodo_mensuracao IS
  'Método CPC 29: custo_historico (padrão) ou fair_value (Vacas leiteiras, matrizes selecionadas).';
COMMENT ON COLUMN animals.fair_value_unit IS
  'Valor Justo unitário em R$/cabeça, calculado por recompute_animal_fair_value.';
COMMENT ON COLUMN animals.fair_value_last_calculated IS
  'Timestamp do último cálculo de VJ (rastreabilidade de mensuração).';

-- B) Função de classificação contábil por categoria
CREATE OR REPLACE FUNCTION _fn_animals_set_conta_contabil()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_cat_norm text;
BEGIN
  -- Normalizar categoria (trim, lower) — robusto a variação caixa/acento
  v_cat_norm := lower(trim(COALESCE(NEW.category, '')));

  -- Mapeamento → código de conta do plano rural (vide 145)
  NEW.conta_contabil := CASE
    -- Não-circulante (reprodução/matrizes)
    WHEN v_cat_norm IN ('touro reprodutor', 'touro')
      THEN '1.2.01.02'  -- Touros reprodutores
    WHEN v_cat_norm IN ('vaca gestante', 'vaca lactante', 'vaca seca', 'vaca matriz', 'matriz')
      THEN '1.2.01.01'  -- Matrizes
    WHEN v_cat_norm IN ('novilha de reposição', 'novilha reposicao')
      THEN '1.2.01.01'  -- Futura matriz → não-circulante

    -- Circulante (destinação abate/venda)
    WHEN v_cat_norm IN ('boi em engorda', 'novilho em engorda', 'novilho')
      THEN '1.1.06.01'  -- Bovinos em engorda (terminação)
    WHEN v_cat_norm IN ('novilha', 'recria')
      THEN '1.1.06.02'  -- Bovinos em recria
    WHEN v_cat_norm IN ('bezerro', 'bezerra', 'bezerro pos-desmama', 'cria')
      THEN '1.1.06.03'  -- Bezerros (cria)

    -- Genérico vaca (sem qualificador) cai em matrizes por segurança
    WHEN v_cat_norm = 'vaca'
      THEN '1.2.01.01'

    -- Fallback: ativo biológico circulante genérico
    ELSE '1.1.06'
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION _fn_animals_set_conta_contabil() IS
  'Mapeia animals.category → conta contábil CPC 29 (1.2.01.x não-circulante, 1.1.06.x circulante).';

DROP TRIGGER IF EXISTS _trg_animals_conta_contabil ON animals;
CREATE TRIGGER _trg_animals_conta_contabil
  BEFORE INSERT OR UPDATE OF category, status, sex ON animals
  FOR EACH ROW
  EXECUTE FUNCTION _fn_animals_set_conta_contabil();

-- C) Função de recálculo de Valor Justo
CREATE OR REPLACE FUNCTION recompute_animal_fair_value(p_animal_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_peso       numeric;
  v_cotacao    numeric;
  v_categoria  text;
  v_setting_key text;
  v_fair_value numeric;
BEGIN
  -- Último peso registrado
  SELECT weight INTO v_peso
  FROM weights
  WHERE animal_id = p_animal_id
  ORDER BY weighing_date DESC, created_at DESC
  LIMIT 1;

  IF v_peso IS NULL OR v_peso <= 0 THEN
    RETURN NULL;
  END IF;

  -- Categoria do animal pra escolher cotação certa
  SELECT lower(trim(COALESCE(category, ''))) INTO v_categoria
  FROM animals
  WHERE id = p_animal_id;

  -- Mapeamento categoria → cotação @ específica (platform_settings.key)
  v_setting_key := CASE
    WHEN v_categoria IN ('bezerro', 'bezerra', 'cria') THEN 'cotacao_bezerro'
    WHEN v_categoria IN ('vaca seca', 'vaca lactante', 'vaca gestante', 'vaca', 'matriz', 'vaca matriz')
      THEN 'cotacao_vaca_gorda'
    WHEN v_categoria IN ('novilho', 'novilho em engorda', 'novilha', 'recria')
      THEN 'cotacao_novilho_precoce'
    ELSE 'cotacao_boi_gordo'  -- Touros, boi em engorda, default
  END;

  -- Buscar cotação (platform_settings.value é text)
  SELECT NULLIF(value, '')::numeric INTO v_cotacao
  FROM platform_settings
  WHERE key = v_setting_key;

  -- Bezerro tem cotação por cabeça, não por @
  IF v_setting_key = 'cotacao_bezerro' THEN
    v_fair_value := COALESCE(v_cotacao, 0);
  ELSE
    -- 1 arroba = 15 kg; cotação é R$/@
    v_fair_value := ROUND((v_peso / 15.0) * COALESCE(v_cotacao, 0), 2);
  END IF;

  -- Update animal (não dispara trg_conta_contabil pq não toca category/status/sex)
  UPDATE animals
    SET fair_value_unit = v_fair_value,
        fair_value_last_calculated = now()
    WHERE id = p_animal_id;

  RETURN v_fair_value;
END;
$$;

COMMENT ON FUNCTION recompute_animal_fair_value(uuid) IS
  'Recalcula valor justo unitário CPC 29 do animal: último peso × cotação @ apropriada. Bezerros usam cotação por cabeça.';

-- D) Backfill 1: forçar disparo do trigger de conta_contabil pra TODOS animais
--    (UPDATE no-op só pra rodar BEFORE UPDATE OF category)
UPDATE animals
  SET category = category
  WHERE category IS NOT NULL;

-- D2) Backfill 2: VJ inicial pra todos animais ativos com peso
DO $$
DECLARE
  v_animal_id uuid;
  v_count integer := 0;
BEGIN
  FOR v_animal_id IN
    SELECT DISTINCT a.id
    FROM animals a
    INNER JOIN weights w ON w.animal_id = a.id
    WHERE a.status = 'Ativo'
  LOOP
    PERFORM recompute_animal_fair_value(v_animal_id);
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'Backfill VJ concluído para % animais', v_count;
END $$;
