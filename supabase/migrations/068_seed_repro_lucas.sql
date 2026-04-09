-- Migration 068: Seed reprodutivo completo para Lucas
-- Estação de monta 2025/2026 com dados realistas de pecuária de corte

DO $$
DECLARE
  v_client  uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9'; -- Lucas
  v_prop    uuid := '00000000-0000-0002-0001-000000000001';  -- Fazenda Santa Cruz
  v_season  uuid;
BEGIN

  -- ── 1. Estação reprodutiva ────────────────────────────────────────────────
  INSERT INTO reproductive_seasons (
    client_id, property_id, season_start, season_end,
    females_inseminated, total_inseminations, apt_count, to_inseminate,
    pregnancy_rate, avg_conception_rate,
    births_performed, born_alive, pregnancy_losses, gestant_deaths,
    total_weaned, males_qty, males_avg_weight, males_gpd,
    females_qty, females_avg_weight, females_gpd,
    avg_weaning_weight, avg_gpd, avg_weaning_age_days, deaths_maternity,
    lost_vacas_descanso2, lost_days_descanso2,
    lost_vacas_descanso203, lost_days_descanso203,
    lost_vacas_dg687, lost_days_dg687
  ) VALUES (
    v_client, v_prop, '2025-10-15', '2026-04-15',
    480, 660, 465, 52,
    72.50, 55.80,
    520, 510, 32, 2,
    485, 240, 235.00, 0.870,
    245, 215.00, 0.790,
    225.00, 0.830, 228, 22,
    3, 180,
    145, 28,
    420, 6
  ) RETURNING id INTO v_season;

  -- ── 2. Serviços de IA (3 repasses) ────────────────────────────────────────
  INSERT INTO reproductive_ia_services (client_id, season_id, service_number, inseminated, diagnosed, pregnant, conception_rate) VALUES
    (v_client, v_season, 1, 480, 460, 278, 60.43),
    (v_client, v_season, 2, 182, 175, 92,  52.57),
    (v_client, v_season, 3, 83,  80,  38,  47.50);

  -- ── 3. Estoque reprodutores ───────────────────────────────────────────────
  INSERT INTO reproductive_stock_summary (client_id, season_id, category, total, pregnant, served, empty) VALUES
    (v_client, v_season, 'Vaca',           320, 230, 48, 42),
    (v_client, v_season, 'Novilha',        110,  82, 16, 12),
    (v_client, v_season, 'Novilha 2a cria', 50,  36,  8,  6),
    (v_client, v_season, 'Total',          480, 348, 72, 60);

END $$;
