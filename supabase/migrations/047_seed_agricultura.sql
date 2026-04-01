-- Migration 047: Seed Agricultura — apenas lucas@agraas.com.br
-- Fazenda Santa Cruz Agrícola · Goiás · Rio Verde

DO $$
DECLARE
  v_client_id   uuid;
  v_farm_id     uuid;
  v_field_a_id  uuid;
  v_field_b_id  uuid;
  v_field_c_id  uuid;
  v_storage1_id uuid;
  v_storage2_id uuid;
  v_shipment_id uuid;

  -- Polígonos fictícios próximos a Rio Verde/GO (~-17.8, -51.0)
  poly_a jsonb := '[
    {"lat": -17.790, "lng": -50.980},
    {"lat": -17.780, "lng": -50.940},
    {"lat": -17.810, "lng": -50.930},
    {"lat": -17.820, "lng": -50.970},
    {"lat": -17.790, "lng": -50.980}
  ]';
  poly_b jsonb := '[
    {"lat": -17.840, "lng": -51.010},
    {"lat": -17.830, "lng": -50.975},
    {"lat": -17.855, "lng": -50.965},
    {"lat": -17.865, "lng": -51.000},
    {"lat": -17.840, "lng": -51.010}
  ]';
  poly_c jsonb := '[
    {"lat": -17.760, "lng": -51.020},
    {"lat": -17.750, "lng": -50.985},
    {"lat": -17.775, "lng": -50.975},
    {"lat": -17.785, "lng": -51.010},
    {"lat": -17.760, "lng": -51.020}
  ]';
BEGIN
  -- ── Cliente Lucas ────────────────────────────────────────────────────────────
  SELECT id INTO v_client_id FROM clients WHERE name ILIKE '%lucas%' LIMIT 1;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Cliente Lucas não encontrado';
  END IF;

  -- ── Fazenda ──────────────────────────────────────────────────────────────────
  INSERT INTO farms_agriculture
    (client_id, name, cnpj, state, city, lat, lng, total_area_ha, car_number, status)
  VALUES (
    v_client_id,
    'Fazenda Santa Cruz Agrícola',
    '34.876.543/0001-22',
    'GO', 'Rio Verde',
    -17.797, -50.981,
    1200.00,
    'GO-5218805-2F4B3A91C8D7E6F5A4B3C2D1E0F98765',
    'active'
  ) RETURNING id INTO v_farm_id;

  -- ── Talhão A — Soja 450 ha, safra 2025/26, plantado ─────────────────────────
  INSERT INTO crop_fields
    (client_id, farm_id, field_code, field_name, area_ha, culture, crop_season,
     planting_date, expected_harvest_date, status, polygon_coordinates)
  VALUES (
    v_client_id, v_farm_id, 'TAL-A', 'Talhão A — Soja Principal',
    450.00, 'soja', '2025/26',
    '2025-10-15', '2026-02-28',
    'plantado', poly_a
  ) RETURNING id INTO v_field_a_id;

  -- ── Talhão B — Milho 300 ha, safrinha 2025, em desenvolvimento ───────────────
  INSERT INTO crop_fields
    (client_id, farm_id, field_code, field_name, area_ha, culture, crop_season,
     planting_date, expected_harvest_date, status, polygon_coordinates)
  VALUES (
    v_client_id, v_farm_id, 'TAL-B', 'Talhão B — Milho Safrinha',
    300.00, 'milho', '2025 safrinha',
    '2025-02-10', '2025-07-15',
    'em_desenvolvimento', poly_b
  ) RETURNING id INTO v_field_b_id;

  -- ── Talhão C — Soja 250 ha, safra 2024/25, colhido ──────────────────────────
  INSERT INTO crop_fields
    (client_id, farm_id, field_code, field_name, area_ha, culture, crop_season,
     planting_date, expected_harvest_date, status, polygon_coordinates)
  VALUES (
    v_client_id, v_farm_id, 'TAL-C', 'Talhão C — Soja Exportação',
    250.00, 'soja', '2024/25',
    '2024-10-20', '2025-03-10',
    'colhido', poly_c
  ) RETURNING id INTO v_field_c_id;

  -- ── Insumos — Talhão A (3) ───────────────────────────────────────────────────
  INSERT INTO crop_inputs
    (client_id, field_id, input_type, product_name, ncm, manufacturer,
     quantity, unit, unit_cost, total_cost, application_date, operator,
     nfe_key, withdrawal_days, withdrawal_date, notes)
  VALUES
    (v_client_id, v_field_a_id, 'semente', 'Semente Soja TMG 7062 IPRO',
     '12019000', 'TMG Sementes',
     4500, 'kg', 8.50, 38250.00,
     '2025-10-14', 'João Mendes',
     '35251234567890000172550010000123456789012345', NULL, NULL,
     'Semente tratada — inoculante incluído'),
    (v_client_id, v_field_a_id, 'fertilizante', 'Fertilizante MAP 11-52-00',
     '31054000', 'Mosaic Fertilizantes',
     180000, 'kg', 2.85, 513000.00,
     '2025-10-13', 'João Mendes',
     '35251234567890000172550010000234567890123456', NULL, NULL,
     'Aplicação no sulco de plantio — 400 kg/ha'),
    (v_client_id, v_field_a_id, 'defensivo', 'Herbicida Roundup Original DI',
     '38089290', 'Bayer CropScience',
     900, 'L', 22.40, 20160.00,
     '2025-11-20', 'Pedro Lima',
     '35251234567890000172550010000345678901234567', 15,
     '2025-12-05',
     'Pós-emergência — 2 L/ha');

  -- ── Insumos — Talhão B (2) ───────────────────────────────────────────────────
  INSERT INTO crop_inputs
    (client_id, field_id, input_type, product_name, ncm, manufacturer,
     quantity, unit, unit_cost, total_cost, application_date, operator,
     nfe_key, withdrawal_days, withdrawal_date, notes)
  VALUES
    (v_client_id, v_field_b_id, 'semente', 'Semente Milho DKB 310 PRO3',
     '10059010', 'Dekalb/Bayer',
     300, 'saco', 185.00, 55500.00,
     '2025-02-08', 'Carlos Silva',
     '35251234567890000172550010000456789012345678', NULL, NULL,
     '60.000 sementes/ha — densidade 5 sacas/ha'),
    (v_client_id, v_field_b_id, 'fertilizante', 'Ureia 45% N Granel',
     '31021000', 'Heringer',
     54000, 'kg', 2.10, 113400.00,
     '2025-03-15', 'Carlos Silva',
     '35251234567890000172550010000567890123456789', NULL, NULL,
     'Adubação nitrogenada cobertura — 180 kg/ha');

  -- ── Insumos — Talhão C (2) ───────────────────────────────────────────────────
  INSERT INTO crop_inputs
    (client_id, field_id, input_type, product_name, ncm, manufacturer,
     quantity, unit, unit_cost, total_cost, application_date, operator,
     nfe_key, withdrawal_days, withdrawal_date, notes)
  VALUES
    (v_client_id, v_field_c_id, 'semente', 'Semente Soja AS 3730 IPRO',
     '12019000', 'Agroeste',
     2500, 'kg', 9.20, 23000.00,
     '2024-10-19', 'João Mendes',
     '35241234567890000172550010000678901234567890', NULL, NULL,
     'Semente certificada RR2Pro'),
    (v_client_id, v_field_c_id, 'defensivo', 'Fungicida Fox Xpro',
     '38089299', 'Bayer CropScience',
     150, 'L', 98.00, 14700.00,
     '2024-12-10', 'Pedro Lima',
     '35241234567890000172550010000789012345678901', 21,
     '2024-12-31',
     'Controle ferrugem asiática — 2 aplicações × 0,30 L/ha');

  -- ── Armazéns ─────────────────────────────────────────────────────────────────
  INSERT INTO crop_storage
    (client_id, name, cnpj, type, state, city, lat, lng, capacity_tons, mapa_registration, status)
  VALUES (
    v_client_id,
    'Armazém Santa Cruz Grãos',
    '34.876.543/0002-03',
    'proprio', 'GO', 'Rio Verde',
    -17.800, -50.960,
    50000.000,
    'MAPA-GO-00123456',
    'active'
  ) RETURNING id INTO v_storage1_id;

  INSERT INTO crop_storage
    (client_id, name, cnpj, type, state, city, lat, lng, capacity_tons, mapa_registration, status)
  VALUES (
    v_client_id,
    'Coopel — Cooperativa de Grãos do Centro-Oeste',
    '11.222.333/0001-44',
    'cooperativa', 'GO', 'Jataí',
    -17.882, -51.713,
    200000.000,
    'MAPA-GO-00987654',
    'active'
  ) RETURNING id INTO v_storage2_id;

  -- ── Movimentações de grãos (Talhão C colhido → Armazém) ─────────────────────
  INSERT INTO crop_storage_movements
    (client_id, field_id, storage_id, movement_type, quantity_tons,
     humidity_pct, impurity_pct, classification, nfe_key, responsible, movement_date, notes)
  VALUES
    (v_client_id, v_field_c_id, v_storage1_id, 'entrada', 682.50,
     12.80, 0.95, 'Tipo 1 — Padrão Exportação',
     '35250134876543000203550010000001234567890123',
     'Transportadora Rota Centro', '2025-03-15',
     'Colheita Talhão C — Safra 2024/25. Peso seco 682,5 t'),
    (v_client_id, v_field_c_id, v_storage1_id, 'saida', 682.50,
     12.80, 0.95, 'Tipo 1 — Padrão Exportação',
     '35250134876543000203550010000001345678901234',
     'Transportadora LogiGrão', '2025-04-02',
     'Saída para Porto de Santos — Embarque AGR-SOJ-2026-001');

  -- ── Embarque ─────────────────────────────────────────────────────────────────
  INSERT INTO crop_shipments
    (client_id, field_id, storage_id, destination_country, destination_port,
     origin_port, vessel_name, departure_date, arrival_date,
     quantity_tons, culture, status, contract_number)
  VALUES (
    v_client_id, v_field_c_id, v_storage1_id,
    'Arábia Saudita', 'Jeddah Islamic Port',
    'Porto de Santos', 'MV Stellar Grain',
    '2025-04-10', '2025-05-02',
    3500.000, 'soja', 'em_transito',
    'AGR-SOJ-2026-001'
  ) RETURNING id INTO v_shipment_id;

  -- ── Tracking — 3 checkpoints ─────────────────────────────────────────────────
  INSERT INTO crop_shipment_tracking
    (shipment_id, client_id, stage, stage_date, quantity_confirmed_tons,
     quantity_lost_tons, location_name, location_lat, location_lng,
     responsible_name, notes)
  VALUES
    (v_shipment_id, v_client_id,
     'fazenda', '2025-04-01 08:00:00-03',
     3500.000, 0,
     'Fazenda Santa Cruz Agrícola — Rio Verde/GO',
     -17.797, -50.981,
     'João Mendes — Gerente Agrícola',
     'Pesagem na balança da fazenda. Umidade 12,8%. Classificação: Tipo 1.'),
    (v_shipment_id, v_client_id,
     'armazem', '2025-04-03 14:30:00-03',
     3498.200, 1.800,
     'Armazém Santa Cruz Grãos — Rio Verde/GO',
     -17.800, -50.960,
     'Supervisor Armazém — Renato Costa',
     'Recebimento no armazém. Perda 1,8 t (umidade natural). Classificação mantida Tipo 1.'),
    (v_shipment_id, v_client_id,
     'porto_origem', '2025-04-08 09:15:00-03',
     3498.200, 0,
     'Terminal Portuário Santos — São Paulo',
     -23.954, -46.333,
     'Agência Marítima GrainShip',
     'Embarque em curso. Vessel MV Stellar Grain — porão 3. Partida prevista 10/04.');

END $$;
