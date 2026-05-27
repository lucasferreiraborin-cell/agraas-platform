-- =============================================================================
-- Migration 123: Score Engine v3 — ancorado em Embrapa Documento Técnico 237
-- =============================================================================
--
-- REFERÊNCIA CIENTÍFICA OFICIAL DESTA REFATORAÇÃO:
-- Costa, F. P.; Dias, F. R. T.; Gomes, R. C.; Pereira, M. A.
-- "Indicadores de desempenho na pecuária de corte: uma revisão no contexto
--  da Plataforma +Precoce"
-- Embrapa Gado de Corte · Documentos 237 · 2018
-- https://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/1090951
--
-- OBJETIVO DESTA MIGRATION
-- ------------------------
-- 1. Consolidar três funções legacy de score (v0/v1/v2) em UMA função canônica
-- 2. Implementar 5 pilares ancorados em Embrapa Doc 237:
--    - Produtivo (peso base 30%)
--    - Sanidade (25%)
--    - Reprodutivo (15% — PREPARADO, sem dados reais ainda)
--    - Rastreabilidade (20%)
--    - Certificações & Compliance (10%)
-- 3. Criar tabela de auditoria score_audit_log com client_id para RLS
-- 4. Criar estrutura de Score de Fazenda (farm_scores) e Score de Produtor
--    (producer_scores) com placeholders dos pilares PREPARADOS
-- 5. Migrar TODOS os triggers para a função canônica calculate_agraas_score_v3
-- 6. Eliminar multicolinearidade (aplicações sanitárias contavam em sanidade
--    E em operacional simultaneamente — corrigido)
-- 7. Substituir lógica binária por gradação logarítmica/categórica
-- 8. CONGELAR score de animal vendido/abatido (status frozen_*) em vez de
--    penalizar continuidade
--
-- PRINCÍPIO REGENTE: postura institucional humilde
-- Em todo comentário, citar a fonte científica. Marcar explicitamente
-- onde há "decisão de equipe Agraas pendente de validação científica
-- na mentoria 29/05/2026".
--
-- Compatível com a v3 declarada em `animal_scores.algorithm_version = 'v3'`.
-- =============================================================================


-- =============================================================================
-- ETAPA 1 — DROP DAS FUNÇÕES LEGACY E TRIGGERS QUE AS CHAMAM
-- =============================================================================

-- Drop dos triggers acionadores que apontavam para a cadeia legacy
DROP TRIGGER IF EXISTS trg_refresh_from_applications        ON applications;
DROP TRIGGER IF EXISTS trg_refresh_from_weight_records      ON weight_records;
DROP TRIGGER IF EXISTS trg_refresh_from_animal_certifications ON animal_certifications;

-- Drop das três funções de cálculo coexistentes (v0, v1, v2)
DROP FUNCTION IF EXISTS public.refresh_animal_score(uuid)        CASCADE;
DROP FUNCTION IF EXISTS public.recalculate_animal_score(uuid)    CASCADE;
DROP FUNCTION IF EXISTS public.calculate_agraas_score(uuid)      CASCADE;

-- Drop da função intermediária que orquestrava as anteriores
DROP FUNCTION IF EXISTS public.refresh_animal_derived_data(uuid) CASCADE;

-- A função trigger_refresh_animal_passport_from_animal_id() existia para
-- adaptar a assinatura entre triggers e refresh_animal_derived_data. Vamos
-- substituí-la por trigger_recalculate_score_v3() abaixo.
DROP FUNCTION IF EXISTS public.trigger_refresh_animal_passport_from_animal_id() CASCADE;


-- =============================================================================
-- ETAPA 2 — TABELA DE AUDITORIA score_audit_log
-- =============================================================================
--
-- Registra TODA mudança "material" (delta_total ≠ 0) de score, capturando:
-- - Que evento operacional disparou o recálculo (qual tabela / qual operação)
-- - Score anterior x score novo
-- - Delta por pilar (positivo se ganhou pontos, negativo se perdeu)
--
-- RLS por client_id (denormalizado): segue o padrão de toda a plataforma
-- multi-tenant. Animal pode mudar de propriedade, mas mantém o cliente.

CREATE TABLE IF NOT EXISTS public.score_audit_log (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id              uuid NOT NULL REFERENCES public.animals(id) ON DELETE CASCADE,
  client_id              uuid NOT NULL,  -- denormalizado para RLS
  property_id            uuid,           -- denormalizado, contexto histórico (pode ser NULL)

  -- Contexto do evento disparador
  event_source           text NOT NULL,  -- nome da tabela que disparou (ex: 'weights', 'applications')
  event_type             text NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE', 'manual'
  event_record_id        uuid,           -- ID do registro na tabela origem (NULL para 'manual')

  -- Scores antes e depois
  score_previous         numeric(5,2),
  score_new              numeric(5,2),

  -- Delta por pilar (positivo = ganhou pontos)
  delta_total            numeric(5,2) NOT NULL DEFAULT 0,
  delta_produtivo        numeric(5,2),
  delta_sanidade         numeric(5,2),
  delta_reprodutivo      numeric(5,2),
  delta_rastreabilidade  numeric(5,2),
  delta_certificacoes    numeric(5,2),

  algorithm_version      text NOT NULL DEFAULT 'v3',
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_score_audit_animal_created ON public.score_audit_log(animal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_score_audit_client         ON public.score_audit_log(client_id);

-- RLS: dono do animal vê seu próprio histórico. Mentor externo via
-- mentor_assignments também vê (read-only, padrão da plataforma).
ALTER TABLE public.score_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY score_audit_log_select_own
  ON public.score_audit_log FOR SELECT
  USING (client_id = get_my_client_id());

-- Mentor externo enxerga histórico de scores dos clientes a que está
-- explicitamente atribuído (modelo Renata/César sobre FSJBE).
CREATE POLICY score_audit_log_select_mentor
  ON public.score_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM public.mentor_assignments ma
       WHERE ma.user_id = auth.uid()
         AND ma.client_id      = score_audit_log.client_id
    )
  );

COMMENT ON TABLE public.score_audit_log IS
'Auditoria de mudanças materiais do Score Agraas v3. Cada linha
 representa um recálculo em que delta_total ≠ 0. Ancorada em Embrapa
 Documento 237 (Costa et al., 2018) via função calculate_agraas_score_v3.';


-- =============================================================================
-- ETAPA 3 — TABELAS farm_scores E producer_scores (NÍVEIS 2 E 3)
-- =============================================================================
--
-- Estrutura preparada para futuras agregações:
-- - Score de Fazenda: média ponderada dos animais ativos da propriedade
-- - Score de Produtor: média das fazendas do produtor
--
-- Pilares "score_produtividade", "score_reprodutivo", "score_sanitario",
-- "score_compliance" e equivalentes do producer_scores ficam como
-- PLACEHOLDERS (NULL) — serão implementados quando tivermos as fontes
-- de dados correspondentes. Esta estrutura permite evolução incremental
-- sem alterar schema novamente.

CREATE TABLE IF NOT EXISTS public.farm_scores (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id          uuid NOT NULL UNIQUE REFERENCES public.properties(id) ON DELETE CASCADE,
  client_id            uuid NOT NULL,  -- denormalizado para RLS

  score_total          numeric(5,2),

  -- Sub-score implementado hoje: média ponderada dos animais ativos
  score_rebanho        numeric(5,2),

  -- Sub-scores PREPARADOS (placeholder para evolução)
  score_produtividade  numeric(5,2),
  score_reprodutivo    numeric(5,2),
  score_sanitario      numeric(5,2),
  score_compliance     numeric(5,2),

  animals_count_active integer,

  algorithm_version    text NOT NULL DEFAULT 'v3',
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_farm_scores_client ON public.farm_scores(client_id);

ALTER TABLE public.farm_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY farm_scores_select_own
  ON public.farm_scores FOR SELECT
  USING (client_id = get_my_client_id());

CREATE POLICY farm_scores_select_mentor
  ON public.farm_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM public.mentor_assignments ma
       WHERE ma.user_id = auth.uid()
         AND ma.client_id      = farm_scores.client_id
    )
  );

COMMENT ON TABLE public.farm_scores IS
'Score consolidado por propriedade. Hoje implementa score_rebanho (média
 ponderada dos animais ativos via calculate_farm_score). Outros sub-scores
 (produtividade, reprodutivo, sanitário, compliance) ficam preparados como
 placeholder NULL para evolução futura sem alteração de schema.';


CREATE TABLE IF NOT EXISTS public.producer_scores (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                uuid NOT NULL UNIQUE,

  score_total              numeric(5,2),

  -- Sub-score implementado hoje
  score_ativos             numeric(5,2),  -- média das fazendas do produtor

  -- Sub-scores PREPARADOS (placeholder)
  score_relacionamento     numeric(5,2),
  score_financeiro         numeric(5,2),
  score_institucional      numeric(5,2),

  properties_count_active  integer,

  algorithm_version        text NOT NULL DEFAULT 'v3',
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_producer_scores_client ON public.producer_scores(client_id);

ALTER TABLE public.producer_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY producer_scores_select_own
  ON public.producer_scores FOR SELECT
  USING (client_id = get_my_client_id());

CREATE POLICY producer_scores_select_mentor
  ON public.producer_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1
        FROM public.mentor_assignments ma
       WHERE ma.user_id = auth.uid()
         AND ma.client_id      = producer_scores.client_id
    )
  );

COMMENT ON TABLE public.producer_scores IS
'Score consolidado por produtor (cliente da plataforma). Hoje implementa
 score_ativos (média ponderada das fazendas do produtor). Outros sub-scores
 (relacionamento, financeiro, institucional) ficam preparados como
 placeholder NULL para evolução futura.';


-- =============================================================================
-- ETAPA 4 — FUNÇÃO AUXILIAR get_animal_category
-- =============================================================================
--
-- Categoriza animal conforme idade + sexo para uso em:
-- - Definição de peso esperado (pilar Produtivo)
-- - Aplicação da fórmula correta de composição final (Condição A vs B)
-- - Comparações com gabaritos zootécnicos brasileiros
--
-- Categorias seguem terminologia consagrada (cf. Embrapa Doc 237,
-- Glossário Pecuária de Corte):
--   bezerro   — < 8 meses (independente de sexo)
--   recria    — 8 a 18 meses
--   terminacao — > 18 meses, machos castrados ou novilhas pré-cobertura
--   matriz    — > 18 meses, fêmeas inteiras (pode entrar reprodução)
--   reprodutor — > 18 meses, machos inteiros
--   descarte  — categoria especial, marcação manual
--   indefinido — fallback quando birth_date OU sex são NULL

CREATE OR REPLACE FUNCTION public.get_animal_category(p_animal_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_birth_date date;
  v_sex        text;
  v_status     text;
  v_age_months integer;
BEGIN
  SELECT a.birth_date, lower(a.sex), lower(a.status)
    INTO v_birth_date, v_sex, v_status
    FROM public.animals a
   WHERE a.id = p_animal_id;

  IF NOT FOUND THEN
    RETURN 'indefinido';
  END IF;

  -- Status especial de descarte tem precedência
  IF v_status = 'descarte' OR v_status = 'cull' THEN
    RETURN 'descarte';
  END IF;

  -- Sem birth_date ou sem sex → fallback indefinido (usa Condição A)
  IF v_birth_date IS NULL OR v_sex IS NULL THEN
    RETURN 'indefinido';
  END IF;

  v_age_months := EXTRACT(YEAR  FROM AGE(current_date, v_birth_date)) * 12
                + EXTRACT(MONTH FROM AGE(current_date, v_birth_date));

  -- Bezerro: até 8 meses (idade típica de desmama Nelore, cf. Embrapa)
  IF v_age_months < 8 THEN
    RETURN 'bezerro';
  END IF;

  -- Recria: 8 a 18 meses
  IF v_age_months < 18 THEN
    RETURN 'recria';
  END IF;

  -- Acima de 18 meses, depende de sexo
  -- (terminologia simplificada: castração explícita não está modelada
  --  no banco — assumimos novilha/terminação para fêmea/macho jovem,
  --  matriz/reprodutor para adulto inteiro. Refinar quando coluna de
  --  castração for adicionada.)
  IF v_sex IN ('female', 'femea', 'f', 'fêmea') THEN
    -- Fêmea adulta: matriz produtiva
    RETURN 'matriz';
  ELSIF v_sex IN ('male', 'macho', 'm') THEN
    -- Macho adulto: heurística simplificada → terminação por default
    -- (assume animal de corte; reprodutor é exceção marcada por status)
    RETURN 'terminacao';
  END IF;

  RETURN 'indefinido';
END;
$$;

COMMENT ON FUNCTION public.get_animal_category(uuid) IS
'Categoriza animal em bezerro/recria/terminacao/matriz/reprodutor/descarte/
 indefinido. Categorias baseadas em Embrapa Doc 237 (glossário pecuária de
 corte). Categoria "indefinido" usa fórmula Condição A no score (sem pilar
 reprodutivo).';


-- =============================================================================
-- ETAPA 5 — FUNÇÃO CANÔNICA calculate_agraas_score_v3
-- =============================================================================
--
-- Implementação Agraas da metodologia Plataforma +Precoce da Embrapa Gado
-- de Corte (Documento 237, Costa et al., 2018), adaptada para
-- rastreabilidade individual.
--
-- ESTRUTURA DOS 5 PILARES:
--   Produtivo        — peso base 30%  (GMD + peso × idade-categoria)
--   Sanidade         — peso base 25%  (histórico + carências + recência)
--   Reprodutivo      — peso base 15%  (PREPARADO — sem dados ainda)
--   Rastreabilidade  — peso base 20%  (RFID + genealogia + eventos + nascimento)
--   Certificações    — peso base 10%  (Boi Verde, Rastreabilidade BR, GAP, etc)
--
-- COMPOSIÇÃO FINAL (v3 inicial, com pilar reprodutivo PREPARADO):
-- O peso 15% do reprodutivo é redistribuído enquanto o pilar estiver
-- inteiramente em PREPARADO:
--   40% do redistribuído → Produtivo  (vai de 30% para 36%)
--   60% do redistribuído → Rastreabilidade (vai de 20% para 29%)
--
--   total = produtivo × 0.36
--         + sanidade × 0.25
--         + rastreabilidade × 0.29
--         + certificacoes × 0.10
--
-- DECISÃO DE EQUIPE AGRAAS PENDENTE DE VALIDAÇÃO CIENTÍFICA NA MENTORIA
-- 29/05/2026: pesos finais (36/25/29/10) escolhidos pela equipe Agraas,
-- ancorados na frequência de citação dos indicadores em Embrapa Doc 237
-- (produtivos: 85-100% das publicações analisadas) mas ainda sem peer
-- review zootécnico oficial. Customização por raça (curvas de crescimento
-- Nelore vs Angus vs Brangus) também pendente de validação.
--
-- ASSINATURA: aceita contexto do evento disparador para gravar audit_log.

CREATE OR REPLACE FUNCTION public.calculate_agraas_score_v3(
  p_animal_id        uuid,
  p_event_source     text DEFAULT 'manual',
  p_event_record_id  uuid DEFAULT NULL,
  p_event_type       text DEFAULT 'manual'
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Metadata do animal
  v_client_id            uuid;
  v_birth_date           date;
  v_sex                  text;
  v_sire_id              uuid;
  v_dam_id               uuid;
  v_current_property_id  uuid;
  v_status               text;
  v_category             text;
  v_age_months           integer;

  -- Inputs do cálculo
  v_last_weight              numeric;
  v_prev_weight              numeric;
  v_last_weight_date         date;
  v_prev_weight_date         date;
  v_app_count                integer;
  v_active_withdrawal_count  integer;
  v_days_since_last_app      integer;
  v_has_rfid                 boolean;
  v_event_count              integer;
  v_has_birth_event          boolean;
  v_certifications_count     integer;

  -- Subscores por pilar (0-100 cada)
  v_produtivo            numeric := 0;
  v_sanidade             numeric := 0;
  v_reprodutivo          numeric := NULL;  -- PREPARADO
  v_rastreabilidade      numeric := 0;
  v_certificacoes        numeric := 0;

  -- Inputs intermediários do pilar Produtivo
  v_gmd                  numeric;
  v_gmd_score            numeric;
  v_peso_esperado_min    numeric;
  v_peso_esperado_max    numeric;
  v_peso_ratio           numeric;
  v_peso_score           numeric;

  -- Inputs intermediários do pilar Sanidade
  v_app_history_score    numeric;
  v_withdrawal_score     numeric;
  v_recency_score        numeric;

  -- Inputs intermediários do pilar Rastreabilidade
  v_rfid_score           numeric;
  v_genealogy_score      numeric;
  v_events_score         numeric;
  v_birth_score          numeric;

  -- Composição final
  v_total                numeric;
  v_score_previous       numeric;
  v_score_status         text;

  -- Audit
  v_delta_total          numeric;
BEGIN
  -- ────────────────────────────────────────────────────────────────────────
  -- ETAPA A — Carrega metadata + status do animal
  -- ────────────────────────────────────────────────────────────────────────
  SELECT a.client_id, a.birth_date, lower(a.sex), a.sire_animal_id,
         a.dam_animal_id, a.current_property_id, lower(a.status)
    INTO v_client_id, v_birth_date, v_sex, v_sire_id,
         v_dam_id, v_current_property_id, v_status
    FROM public.animals a
   WHERE a.id = p_animal_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Animal vendido/abatido: CONGELA o score, não recalcula
  -- (Embrapa Doc 237: "taxa de desfrute" valoriza venda; penalizar venda é
  --  inverter a lógica zootécnica. Implementação correta é congelar valor.)
  IF v_status IN ('sold', 'vendido', 'slaughtered', 'abatido') THEN
    UPDATE public.animal_scores
       SET score_status = CASE
                            WHEN v_status IN ('sold', 'vendido') THEN 'frozen_sold'
                            ELSE 'frozen_slaughtered'
                          END,
           algorithm_version = 'v3',
           updated_at = now()
     WHERE animal_id = p_animal_id;
    RETURN (SELECT total_score FROM public.animal_scores WHERE animal_id = p_animal_id);
  END IF;

  v_category := get_animal_category(p_animal_id);

  -- ────────────────────────────────────────────────────────────────────────
  -- ETAPA B — Coleta variáveis de entrada (queries em paralelo conceitual)
  -- ────────────────────────────────────────────────────────────────────────

  -- Últimas duas pesagens (para cálculo de GMD)
  SELECT w.weight, w.weighing_date INTO v_last_weight, v_last_weight_date
    FROM public.weights w
   WHERE w.animal_id = p_animal_id
   ORDER BY w.weighing_date DESC, w.created_at DESC
   LIMIT 1;

  SELECT w.weight, w.weighing_date INTO v_prev_weight, v_prev_weight_date
    FROM public.weights w
   WHERE w.animal_id = p_animal_id
     AND w.weighing_date < v_last_weight_date
   ORDER BY w.weighing_date DESC, w.created_at DESC
   LIMIT 1;

  -- Contagem de aplicações sanitárias (todas as épocas)
  SELECT count(*) INTO v_app_count
    FROM public.applications a
   WHERE a.animal_id = p_animal_id;

  -- Carências sanitárias ativas (impedimento à comercialização)
  SELECT count(*) INTO v_active_withdrawal_count
    FROM public.applications a
   WHERE a.animal_id = p_animal_id
     AND a.withdrawal_end_date IS NOT NULL
     AND a.withdrawal_end_date >= current_date;

  -- Dias desde a última aplicação (recência sanitária)
  -- (date - date) já retorna integer (dias) em Postgres; EXTRACT não aplica.
  SELECT (current_date - max(a.application_date))::integer
    INTO v_days_since_last_app
    FROM public.applications a
   WHERE a.animal_id = p_animal_id;

  -- Identificação eletrônica
  SELECT EXISTS(SELECT 1 FROM public.animal_rfids ar WHERE ar.animal_id = p_animal_id)
    INTO v_has_rfid;

  -- Contagem de eventos estruturados
  SELECT count(*) INTO v_event_count
    FROM public.events e
   WHERE e.animal_id = p_animal_id;

  -- Evento de nascimento na propriedade
  SELECT EXISTS(
    SELECT 1 FROM public.events e
     WHERE e.animal_id = p_animal_id
       AND lower(e.event_type) IN ('birth', 'nascimento')
  ) INTO v_has_birth_event;

  -- Certificações ativas
  SELECT count(*) INTO v_certifications_count
    FROM public.animal_certifications c
   WHERE c.animal_id = p_animal_id
     AND lower(c.status) = 'active';

  -- ────────────────────────────────────────────────────────────────────────
  -- ETAPA C — PILAR PRODUTIVO (peso base 30%, ajustado para 36% nesta v3)
  -- Ref: Embrapa Doc 237 — indicadores produtivos aparecem em 85-100% das
  -- publicações analisadas, justificando o maior peso.
  -- ────────────────────────────────────────────────────────────────────────

  -- Sub C.1 — GMD (Ganho Médio Diário, kg PV/dia) [ATIVO, peso interno 50%]
  IF v_last_weight IS NOT NULL AND v_prev_weight IS NOT NULL
     AND v_last_weight_date > v_prev_weight_date THEN
    -- (date - date) retorna integer; usar diretamente (não EXTRACT)
    v_gmd := (v_last_weight - v_prev_weight)
           / GREATEST(1, (v_last_weight_date - v_prev_weight_date)::numeric);

    -- Faixas Embrapa Doc 237 para GMD em pecuária de corte BR:
    --   < 0,3 kg/d: péssimo (0-30 pts)
    --   0,3-0,5: fraco (30-50)
    --   0,5-0,8: regular (50-70)
    --   0,8-1,2: bom (70-90) — faixa típica pasto manejado
    --   > 1,2: excelente (90-100) — faixa típica confinamento
    v_gmd_score := CASE
      WHEN v_gmd < 0.0  THEN 0
      WHEN v_gmd < 0.3  THEN  0 + (v_gmd / 0.3) * 30
      WHEN v_gmd < 0.5  THEN 30 + ((v_gmd - 0.3) / 0.2) * 20
      WHEN v_gmd < 0.8  THEN 50 + ((v_gmd - 0.5) / 0.3) * 20
      WHEN v_gmd < 1.2  THEN 70 + ((v_gmd - 0.8) / 0.4) * 20
      ELSE LEAST(100, 90 + ((v_gmd - 1.2) / 0.4) * 10)
    END;
  ELSE
    -- Sem pesagens suficientes: GMD não computa (peso interno é
    -- redistribuído para o sub-componente Peso × Idade abaixo)
    v_gmd_score := NULL;
  END IF;

  -- Sub C.2 — Peso × Categoria de idade [ATIVO, peso interno 50%]
  -- Referência: gabarito Nelore (raça mais comum no Brasil, cf. Embrapa
  -- Doc 237). DECISÃO DE EQUIPE AGRAAS PENDENTE: customização por raça
  -- (Angus, Brangus) aguardando validação científica na mentoria 29/05.
  IF v_last_weight IS NOT NULL AND v_birth_date IS NOT NULL THEN
    v_age_months := EXTRACT(YEAR  FROM AGE(current_date, v_birth_date)) * 12
                  + EXTRACT(MONTH FROM AGE(current_date, v_birth_date));

    SELECT pmin, pmax INTO v_peso_esperado_min, v_peso_esperado_max
      FROM (
        SELECT  150::numeric AS pmin,  180::numeric AS pmax WHERE v_age_months <  6
        UNION ALL SELECT 180,  220 WHERE v_age_months BETWEEN  6 AND  9
        UNION ALL SELECT 240,  280 WHERE v_age_months BETWEEN 10 AND 14
        UNION ALL SELECT 320,  380 WHERE v_age_months BETWEEN 15 AND 20
        UNION ALL SELECT 420,  480 WHERE v_age_months BETWEEN 21 AND 26
        UNION ALL SELECT 480,  540 WHERE v_age_months BETWEEN 27 AND 32
        UNION ALL SELECT 480,  650 WHERE v_age_months > 32
      ) bands LIMIT 1;

    IF v_peso_esperado_min IS NOT NULL THEN
      v_peso_ratio := v_last_weight / ((v_peso_esperado_min + v_peso_esperado_max) / 2);
      v_peso_score := CASE
        WHEN v_peso_ratio < 0.7  THEN  0 + (v_peso_ratio / 0.7) * 30
        WHEN v_peso_ratio < 0.9  THEN 30 + ((v_peso_ratio - 0.7) / 0.2) * 30
        WHEN v_peso_ratio < 1.1  THEN 60 + ((v_peso_ratio - 0.9) / 0.2) * 30   -- faixa ideal 90-110%
        ELSE LEAST(100, 90 + ((v_peso_ratio - 1.1) / 0.3) * 10)
      END;
    ELSE
      v_peso_score := NULL;
    END IF;
  ELSE
    v_peso_score := NULL;
  END IF;

  -- Composição do pilar Produtivo (média ponderada do que está ATIVO)
  v_produtivo := CASE
    WHEN v_gmd_score IS NOT NULL AND v_peso_score IS NOT NULL
      THEN (v_gmd_score * 0.5) + (v_peso_score * 0.5)
    WHEN v_gmd_score IS NOT NULL  THEN v_gmd_score
    WHEN v_peso_score IS NOT NULL THEN v_peso_score
    ELSE 30  -- score base mínimo: animal cadastrado sem dado produtivo
  END;

  v_produtivo := GREATEST(0, LEAST(100, v_produtivo));

  -- ────────────────────────────────────────────────────────────────────────
  -- ETAPA D — PILAR SANIDADE (peso 25%)
  -- ────────────────────────────────────────────────────────────────────────

  -- Sub D.1 — Histórico de aplicações (gradação logarítmica) [peso interno 50%]
  -- Substitui lógica binária "tem ou não tem". Lei dos retornos decrescentes:
  -- primeiras aplicações importam muito mais que aplicações marginais.
  v_app_history_score := CASE
    WHEN v_app_count = 0  THEN  30
    WHEN v_app_count <= 2 THEN  50
    WHEN v_app_count <= 5 THEN  70
    WHEN v_app_count <= 10 THEN 85
    ELSE                       100
  END;

  -- Sub D.2 — Status de carência ativa [peso interno 30%]
  v_withdrawal_score := CASE
    WHEN v_active_withdrawal_count = 0 THEN 100
    WHEN v_active_withdrawal_count = 1 THEN  50
    ELSE                                      0
  END;

  -- Sub D.3 — Recência da última aplicação [peso interno 20%]
  v_recency_score := CASE
    WHEN v_days_since_last_app IS NULL          THEN   0  -- nunca aplicada
    WHEN v_days_since_last_app <= 90            THEN 100
    WHEN v_days_since_last_app <= 180           THEN  80
    WHEN v_days_since_last_app <= 365           THEN  60
    ELSE                                                30  -- > 1 ano: atrasado
  END;

  v_sanidade := (v_app_history_score * 0.5)
              + (v_withdrawal_score  * 0.3)
              + (v_recency_score     * 0.2);
  v_sanidade := GREATEST(0, LEAST(100, v_sanidade));

  -- IMPORTANTE — CORREÇÃO DE MULTICOLINEARIDADE:
  -- Nas versões v0/v1, aplicações sanitárias contavam SIMULTANEAMENTE
  -- no pilar Sanidade E no pilar Operacional (double counting).
  -- Na v3, aplicações contam APENAS aqui. O pilar de Rastreabilidade
  -- usa variáveis distintas (RFID, eventos, genealogia, nascimento).

  -- ────────────────────────────────────────────────────────────────────────
  -- ETAPA E — PILAR REPRODUTIVO (peso base 15% — PREPARADO)
  -- ────────────────────────────────────────────────────────────────────────
  --
  -- TODO Reprodutivo: implementação aguarda
  --   - idade ao primeiro parto (eventos estruturados de parto)
  --   - intervalo entre partos (IEP)
  --   - taxa de prenhez individual
  -- Hoje retornamos NULL e o peso 15% é redistribuído (40% Produtivo,
  -- 60% Rastreabilidade) — implementação na composição final abaixo.

  v_reprodutivo := NULL;

  -- ────────────────────────────────────────────────────────────────────────
  -- ETAPA F — PILAR RASTREABILIDADE (peso base 20%, ajustado para 29%)
  -- ────────────────────────────────────────────────────────────────────────

  -- Sub F.1 — RFID (identificação eletrônica) [peso interno 25%]
  v_rfid_score := CASE WHEN v_has_rfid THEN 100 ELSE 0 END;

  -- Sub F.2 — Genealogia (gradação por gerações conhecidas) [peso interno 25%]
  v_genealogy_score := CASE
    WHEN v_sire_id IS NOT NULL AND v_dam_id IS NOT NULL THEN 100
    WHEN v_sire_id IS NOT NULL OR  v_dam_id IS NOT NULL THEN  50
    ELSE                                                       0
  END;

  -- Sub F.3 — Continuidade documental (eventos estruturados) [peso interno 25%]
  v_events_score := CASE
    WHEN v_event_count = 0   THEN   0
    WHEN v_event_count <= 3  THEN  40
    WHEN v_event_count <= 7  THEN  70
    ELSE                          100
  END;

  -- Sub F.4 — Registro de nascimento na propriedade [peso interno 25%]
  v_birth_score := CASE WHEN v_has_birth_event THEN 100 ELSE 50 END;

  v_rastreabilidade := (v_rfid_score      * 0.25)
                     + (v_genealogy_score * 0.25)
                     + (v_events_score    * 0.25)
                     + (v_birth_score     * 0.25);
  v_rastreabilidade := GREATEST(0, LEAST(100, v_rastreabilidade));

  -- ────────────────────────────────────────────────────────────────────────
  -- ETAPA G — PILAR CERTIFICAÇÕES & COMPLIANCE (peso 10%)
  -- ────────────────────────────────────────────────────────────────────────
  --
  -- Soma certificações ativas por código (cap em 100). Pesos individuais
  -- refletem importância de mercado e exigência regulatória.

  SELECT LEAST(100, COALESCE(SUM(CASE
    WHEN lower(certification_code) LIKE '%boi-verde%'
      OR lower(certification_name) LIKE '%boi verde%'    THEN 25
    WHEN lower(certification_code) LIKE 'br-ras%'
      OR lower(certification_name) LIKE '%rastreabilidade br%' THEN 25
    WHEN lower(certification_code) LIKE 'bea%'
      OR lower(certification_name) LIKE '%bem-estar%'
      OR lower(certification_name) LIKE '%gap%'          THEN 25
    WHEN lower(certification_code) LIKE 'pca%'
      OR lower(certification_name) LIKE '%angus%'
      OR lower(certification_name) LIKE '%hereford%'
      OR lower(certification_name) LIKE '%brangus%'      THEN 25
    WHEN lower(certification_code) LIKE 'hilton%'
      OR lower(certification_name) LIKE '%cota 481%'
      OR lower(certification_name) LIKE '%hilton%'       THEN 30
    ELSE 10  -- certificação não catalogada: contribuição mínima
  END), 0))
  INTO v_certificacoes
  FROM public.animal_certifications c
  WHERE c.animal_id = p_animal_id
    AND lower(c.status) = 'active';

  v_certificacoes := COALESCE(v_certificacoes, 0);
  -- DECISÃO DE EQUIPE AGRAAS PENDENTE: pesos individuais de certificações
  -- (Boi Verde 25, Rastreabilidade BR 25, GAP 25, Programa de Raça 25,
  -- Hilton 30) escolhidos pela equipe Agraas. Validação científica
  -- pendente da mentoria 29/05/2026.

  -- ────────────────────────────────────────────────────────────────────────
  -- ETAPA H — COMPOSIÇÃO FINAL (v3 sem reprodutivo ativo: Condição A)
  -- ────────────────────────────────────────────────────────────────────────

  v_total := ROUND(
      v_produtivo        * 0.36
    + v_sanidade         * 0.25
    + v_rastreabilidade  * 0.29
    + v_certificacoes    * 0.10
  , 2);

  v_total := GREATEST(0, LEAST(100, v_total));

  -- ────────────────────────────────────────────────────────────────────────
  -- ETAPA I — UPSERT em animal_scores (bypass triggers recursivos)
  -- ────────────────────────────────────────────────────────────────────────

  -- Captura score anterior para audit
  SELECT total_score INTO v_score_previous
    FROM public.animal_scores
   WHERE animal_id = p_animal_id;

  -- Bypass recursivo (mesmo padrão das funções v0/v1/v2 históricas)
  SET LOCAL session_replication_role = replica;

  INSERT INTO public.animal_scores (
    animal_id, sanitary_score, operational_score, continuity_score,
    productive_score, total_score, score_status, score_version,
    algorithm_version, last_updated, updated_at
  ) VALUES (
    p_animal_id,
    v_sanidade,        -- legacy column: usamos para sanidade v3
    v_rastreabilidade, -- legacy column: usamos para rastreabilidade v3 (compat UI)
    COALESCE(v_reprodutivo, 0),  -- legacy column: usamos para reprodutivo v3
    v_produtivo,
    v_total, 'current', 'v3', 'v3', now(), now()
  )
  ON CONFLICT (animal_id) DO UPDATE SET
    sanitary_score    = EXCLUDED.sanitary_score,
    operational_score = EXCLUDED.operational_score,
    continuity_score  = EXCLUDED.continuity_score,
    productive_score  = EXCLUDED.productive_score,
    total_score       = EXCLUDED.total_score,
    score_status      = 'current',
    score_version     = 'v3',
    algorithm_version = 'v3',
    last_updated      = now(),
    updated_at        = now();

  SET LOCAL session_replication_role = DEFAULT;

  -- ────────────────────────────────────────────────────────────────────────
  -- ETAPA J — Audit log (apenas se delta_total ≠ 0, i.e. mudança material)
  -- ────────────────────────────────────────────────────────────────────────

  v_delta_total := v_total - COALESCE(v_score_previous, 0);

  IF ABS(v_delta_total) >= 0.01 THEN  -- 1 centésimo de ponto, evita ruído numérico
    INSERT INTO public.score_audit_log (
      animal_id, client_id, property_id,
      event_source, event_type, event_record_id,
      score_previous, score_new,
      delta_total,
      delta_produtivo, delta_sanidade, delta_reprodutivo,
      delta_rastreabilidade, delta_certificacoes,
      algorithm_version
    ) VALUES (
      p_animal_id, v_client_id, v_current_property_id,
      p_event_source, p_event_type, p_event_record_id,
      v_score_previous, v_total,
      v_delta_total,
      NULL, NULL, NULL, NULL, NULL,  -- deltas por pilar: implementação refinada em v3.1
      'v3'
    );
  END IF;

  -- ────────────────────────────────────────────────────────────────────────
  -- ETAPA K — Sincroniza passport cache + dispara cascata farm/producer
  -- ────────────────────────────────────────────────────────────────────────

  PERFORM public.refresh_animal_passport(p_animal_id);

  -- Cascata síncrona (v3 inicial — performance OK para escala atual):
  -- Recálculo de farm_score da propriedade, depois producer_score do cliente.
  IF v_current_property_id IS NOT NULL THEN
    PERFORM public.calculate_farm_score(v_current_property_id);
  END IF;

  IF v_client_id IS NOT NULL THEN
    PERFORM public.calculate_producer_score(v_client_id);
  END IF;

  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION public.calculate_agraas_score_v3(uuid, text, uuid, text) IS
'Função canônica do Score Agraas v3. Implementação Agraas da metodologia
 Plataforma +Precoce da Embrapa Gado de Corte (Documento 237, Costa et al.,
 2018), adaptada para rastreabilidade individual. 5 pilares: Produtivo (36%),
 Sanidade (25%), Reprodutivo (PREPARADO), Rastreabilidade (29%), Certificações
 (10%). Pesos finais pendentes de validação científica na mentoria
 IZ-SP 29/05/2026.';


-- =============================================================================
-- ETAPA 6 — FUNÇÕES calculate_farm_score E calculate_producer_score
-- =============================================================================

CREATE OR REPLACE FUNCTION public.calculate_farm_score(p_property_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id  uuid;
  v_score_avg  numeric;
  v_count      integer;
BEGIN
  SELECT pr.client_id INTO v_client_id
    FROM public.properties pr
   WHERE pr.id = p_property_id;

  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Média ponderada dos animais ativos da propriedade
  -- (excluindo frozen_sold / frozen_slaughtered)
  SELECT AVG(s.total_score), count(*)
    INTO v_score_avg, v_count
    FROM public.animal_scores s
    JOIN public.animals a ON a.id = s.animal_id
   WHERE a.current_property_id = p_property_id
     AND s.score_status = 'current';

  INSERT INTO public.farm_scores (
    property_id, client_id,
    score_total, score_rebanho, animals_count_active,
    algorithm_version, updated_at
  ) VALUES (
    p_property_id, v_client_id,
    COALESCE(v_score_avg, 0), COALESCE(v_score_avg, 0), COALESCE(v_count, 0),
    'v3', now()
  )
  ON CONFLICT (property_id) DO UPDATE SET
    score_total          = EXCLUDED.score_total,
    score_rebanho        = EXCLUDED.score_rebanho,
    animals_count_active = EXCLUDED.animals_count_active,
    client_id            = EXCLUDED.client_id,
    algorithm_version    = 'v3',
    updated_at           = now();

  RETURN v_score_avg;
END;
$$;

COMMENT ON FUNCTION public.calculate_farm_score(uuid) IS
'Score de Fazenda v3. Hoje implementa score_rebanho (média ponderada
 dos animais ativos). Pilares produtividade/reprodutivo/sanitário/
 compliance ficam preparados como NULL para evolução incremental.';


CREATE OR REPLACE FUNCTION public.calculate_producer_score(p_client_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score_avg  numeric;
  v_count      integer;
BEGIN
  -- Média das fazendas ativas do produtor
  SELECT AVG(fs.score_total), count(*)
    INTO v_score_avg, v_count
    FROM public.farm_scores fs
   WHERE fs.client_id = p_client_id;

  INSERT INTO public.producer_scores (
    client_id, score_total, score_ativos, properties_count_active,
    algorithm_version, updated_at
  ) VALUES (
    p_client_id, COALESCE(v_score_avg, 0), COALESCE(v_score_avg, 0),
    COALESCE(v_count, 0), 'v3', now()
  )
  ON CONFLICT (client_id) DO UPDATE SET
    score_total             = EXCLUDED.score_total,
    score_ativos            = EXCLUDED.score_ativos,
    properties_count_active = EXCLUDED.properties_count_active,
    algorithm_version       = 'v3',
    updated_at              = now();

  RETURN v_score_avg;
END;
$$;

COMMENT ON FUNCTION public.calculate_producer_score(uuid) IS
'Score de Produtor v3. Hoje implementa score_ativos (média ponderada
 das fazendas). Pilares relacionamento/financeiro/institucional ficam
 preparados como NULL para evolução incremental.';


-- =============================================================================
-- ETAPA 7 — TRIGGER WRAPPER + RECRIAÇÃO DOS TRIGGERS DAS TABELAS DE INPUT
-- =============================================================================
--
-- Trigger wrapper: extrai NEW.animal_id (ou OLD.animal_id em DELETE) e
-- chama calculate_agraas_score_v3 com event_source = nome da tabela,
-- event_type = INSERT/UPDATE/DELETE, event_record_id = id do registro.

CREATE OR REPLACE FUNCTION public.trigger_recalculate_score_v3()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_animal_id uuid;
  v_record_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_animal_id := OLD.animal_id;
    v_record_id := OLD.id;
  ELSE
    v_animal_id := NEW.animal_id;
    v_record_id := NEW.id;
  END IF;

  IF v_animal_id IS NOT NULL THEN
    PERFORM public.calculate_agraas_score_v3(
      v_animal_id,
      TG_TABLE_NAME,
      v_record_id,
      TG_OP
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers nas tabelas de input. Repointadas todas para a função v3.
-- IMPORTANTE: triggers apontam para `weights` (tabela atual), não mais
-- `weight_records` (legado).

CREATE TRIGGER trg_score_v3_from_weights
  AFTER INSERT OR UPDATE OR DELETE ON public.weights
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_score_v3();

CREATE TRIGGER trg_score_v3_from_applications
  AFTER INSERT OR UPDATE OR DELETE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_score_v3();

CREATE TRIGGER trg_score_v3_from_certifications
  AFTER INSERT OR UPDATE OR DELETE ON public.animal_certifications
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_score_v3();

CREATE TRIGGER trg_score_v3_from_rfids
  AFTER INSERT OR UPDATE OR DELETE ON public.animal_rfids
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_score_v3();

CREATE TRIGGER trg_score_v3_from_events
  AFTER INSERT OR UPDATE OR DELETE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_score_v3();

CREATE TRIGGER trg_score_v3_from_movements
  AFTER INSERT OR UPDATE OR DELETE ON public.animal_movements
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_score_v3();


-- =============================================================================
-- ETAPA 8 — DEPRECATE VIEW animal_events COMPATIBILIDADE
-- =============================================================================

COMMENT ON VIEW public.animal_events IS
'DEPRECATED — 2026-05-22. Use tabela events diretamente. Será removida em
 v3.1 após validação completa de dependências. Mantida apenas para
 compatibilidade com código legado durante a transição.';


-- =============================================================================
-- ETAPA 9 — RECÁLCULO RETROATIVO DE TODOS OS 63 ANIMAIS DO BANCO
-- =============================================================================
--
-- Após a v3 entrar, todos os scores antigos ficam stale (foram calculados
-- pela v0/v1/v2). Recalculamos em batch para que mentores vejam números
-- frescos na sessão de 29/05/2026.

DO $$
DECLARE
  v_animal_id uuid;
  v_total integer := 0;
BEGIN
  FOR v_animal_id IN SELECT id FROM public.animals LOOP
    BEGIN
      PERFORM public.calculate_agraas_score_v3(
        v_animal_id, 'migration_123', NULL, 'manual'
      );
      v_total := v_total + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Falha ao recalcular animal %: %', v_animal_id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Migration 123: % animais recalculados para Score v3', v_total;
END $$;


-- =============================================================================
-- ETAPA 10 — VERIFICAÇÕES FINAIS DE INTEGRIDADE
-- =============================================================================

-- Confirma que NENHUM trigger ativo aponta mais para weight_records (legado)
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
    FROM information_schema.triggers
   WHERE event_object_table = 'weight_records'
     AND trigger_schema = 'public';

  IF v_count > 0 THEN
    RAISE NOTICE 'AVISO: % triggers ainda apontam para weight_records (legado)', v_count;
  ELSE
    RAISE NOTICE 'OK: nenhum trigger ativo em weight_records';
  END IF;
END $$;

-- Confirma que função canônica existe e é única
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname IN ('refresh_animal_score', 'recalculate_animal_score', 'calculate_agraas_score');

  IF v_count > 0 THEN
    RAISE EXCEPTION 'FALHA: % funções legacy ainda existem', v_count;
  END IF;

  SELECT count(*) INTO v_count
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'calculate_agraas_score_v3';

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FALHA: calculate_agraas_score_v3 deveria existir uma única vez (achadas: %)', v_count;
  END IF;

  RAISE NOTICE 'OK: função canônica calculate_agraas_score_v3 estabelecida como única fonte de verdade';
END $$;

-- =============================================================================
-- Fim da Migration 123_score_engine_v3.sql
-- Próximo passo: docs/score-engine-changelog-v3.md + UI ScoreRing v3
-- =============================================================================
