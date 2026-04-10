-- Migration 080: Seed demo PIF — 5 animais premium para demo com investidores

DO $$
DECLARE
  v_lucas    uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_prop     uuid := '00000000-0000-0002-0001-000000000001'; -- Fazenda Santa Cruz
  v_pif      uuid := '187dc70c-d621-40f6-87b5-9033866fd150'; -- PIF buyer
  v_ourofino uuid;
  v_zoetis   uuid;
  v_elanco   uuid;
  v_prod_aftosa uuid;
  v_prod_bruc   uuid;
  v_prod_iverm  uuid;
  v_a1 uuid; v_a2 uuid; v_a3 uuid; v_a4 uuid; v_a5 uuid;
  v_lot uuid;
BEGIN

  SET LOCAL session_replication_role = 'replica';

  -- ═══ 1. Fornecedores ═══════════════════════════════════════════════════════
  INSERT INTO suppliers (client_id, name, cnpj, contact_name, category)
  VALUES (v_lucas, 'Ourofino Saúde Animal', '28.460.342/0001-06', 'Representante SP', 'vacina')
  RETURNING id INTO v_ourofino;

  INSERT INTO suppliers (client_id, name, cnpj, contact_name, category)
  VALUES (v_lucas, 'Zoetis', '54.735.650/0001-44', 'Representante Regional', 'medicamento')
  RETURNING id INTO v_zoetis;

  INSERT INTO suppliers (client_id, name, cnpj, contact_name, category)
  VALUES (v_lucas, 'Elanco', '63.049.562/0001-50', 'Representante GO', 'medicamento')
  RETURNING id INTO v_elanco;

  -- ═══ 2. Produtos faltantes ═════════════════════════════════════════════════
  -- Aftosa (não existe para Lucas)
  INSERT INTO products (client_id, supplier_id, name, unit, category, withdrawal_days)
  VALUES (v_lucas, v_ourofino, 'Vacina Aftosa', 'ml', 'vacina', 0)
  RETURNING id INTO v_prod_aftosa;

  -- Dectomax
  INSERT INTO products (client_id, supplier_id, name, unit, category, withdrawal_days)
  VALUES (v_lucas, v_zoetis, 'Dectomax', 'ml', 'antiparasitario', 33);

  -- Busca produtos existentes
  SELECT id INTO v_prod_bruc FROM products WHERE client_id = v_lucas AND name ILIKE '%brucelose%' LIMIT 1;
  IF v_prod_bruc IS NULL THEN
    INSERT INTO products (client_id, supplier_id, name, unit, category, withdrawal_days)
    VALUES (v_lucas, v_ourofino, 'Vacina Brucelose B19', 'ml', 'vacina', 0)
    RETURNING id INTO v_prod_bruc;
  END IF;

  SELECT id INTO v_prod_iverm FROM products WHERE client_id = v_lucas AND name ILIKE '%ivermectina%' LIMIT 1;
  IF v_prod_iverm IS NULL THEN
    INSERT INTO products (client_id, supplier_id, name, unit, category, withdrawal_days)
    VALUES (v_lucas, v_elanco, 'Ivermectina 1%', 'ml', 'vermifugo', 30)
    RETURNING id INTO v_prod_iverm;
  END IF;

  -- ═══ 3. Animais premium ════════════════════════════════════════════════════
  INSERT INTO animals (client_id, current_property_id, internal_code, nickname, breed, sex, birth_date, status, category)
  VALUES (v_lucas, v_prop, 'SAU-001', 'Abdullah',  'Nelore', 'Male',   '2022-03-15', 'Ativo', 'Touro reprodutor')
  RETURNING id INTO v_a1;

  INSERT INTO animals (client_id, current_property_id, internal_code, nickname, breed, sex, birth_date, status, category)
  VALUES (v_lucas, v_prop, 'SAU-002', 'Khalid',    'Nelore', 'Male',   '2022-06-20', 'Ativo', 'Touro reprodutor')
  RETURNING id INTO v_a2;

  INSERT INTO animals (client_id, current_property_id, internal_code, nickname, breed, sex, birth_date, status, category)
  VALUES (v_lucas, v_prop, 'SAU-003', 'Omar',      'Nelore', 'Male',   '2021-11-10', 'Ativo', 'Touro reprodutor')
  RETURNING id INTO v_a3;

  INSERT INTO animals (client_id, current_property_id, internal_code, nickname, breed, sex, birth_date, status, category)
  VALUES (v_lucas, v_prop, 'SAU-004', 'Yusuf',     'Nelore', 'Male',   '2022-01-05', 'Ativo', 'Touro reprodutor')
  RETURNING id INTO v_a4;

  INSERT INTO animals (client_id, current_property_id, internal_code, nickname, breed, sex, birth_date, status, category)
  VALUES (v_lucas, v_prop, 'SAU-005', 'Ibrahim',   'Nelore', 'Male',   '2021-08-22', 'Ativo', 'Touro reprodutor')
  RETURNING id INTO v_a5;

  -- ═══ 4. Pesagens (3 por animal — crescente) ═══════════════════════════════
  INSERT INTO weights (animal_id, weight, weighing_date) VALUES
    (v_a1, 38,  '2022-03-15'), (v_a1, 320, '2023-06-15'), (v_a1, 520, '2026-03-20'),
    (v_a2, 36,  '2022-06-20'), (v_a2, 310, '2023-09-20'), (v_a2, 498, '2026-03-22'),
    (v_a3, 40,  '2021-11-10'), (v_a3, 345, '2023-02-10'), (v_a3, 580, '2026-03-18'),
    (v_a4, 37,  '2022-01-05'), (v_a4, 330, '2023-04-05'), (v_a4, 540, '2026-03-25'),
    (v_a5, 42,  '2021-08-22'), (v_a5, 360, '2022-11-22'), (v_a5, 610, '2026-03-15');

  -- ═══ 5. Aplicações (3 por animal) ═════════════════════════════════════════
  INSERT INTO applications (animal_id, product_name, product_id, dose, unit, application_date, withdrawal_date, operator_name, applied_by) VALUES
    -- Aftosa
    (v_a1, 'Vacina Aftosa', v_prod_aftosa, 5, 'ml', '2026-01-10', '2026-01-10', 'Dr. Ahmed Al-Rashid', 'Dr. Ahmed Al-Rashid'),
    (v_a2, 'Vacina Aftosa', v_prod_aftosa, 5, 'ml', '2026-01-10', '2026-01-10', 'Dr. Ahmed Al-Rashid', 'Dr. Ahmed Al-Rashid'),
    (v_a3, 'Vacina Aftosa', v_prod_aftosa, 5, 'ml', '2026-01-10', '2026-01-10', 'Dr. Ahmed Al-Rashid', 'Dr. Ahmed Al-Rashid'),
    (v_a4, 'Vacina Aftosa', v_prod_aftosa, 5, 'ml', '2026-01-10', '2026-01-10', 'Dr. Ahmed Al-Rashid', 'Dr. Ahmed Al-Rashid'),
    (v_a5, 'Vacina Aftosa', v_prod_aftosa, 5, 'ml', '2026-01-10', '2026-01-10', 'Dr. Ahmed Al-Rashid', 'Dr. Ahmed Al-Rashid'),
    -- Brucelose
    (v_a1, 'Vacina Brucelose B19', v_prod_bruc, 2, 'ml', '2026-02-15', '2026-02-15', 'Dr. Ahmed Al-Rashid', 'Dr. Ahmed Al-Rashid'),
    (v_a2, 'Vacina Brucelose B19', v_prod_bruc, 2, 'ml', '2026-02-15', '2026-02-15', 'Dr. Ahmed Al-Rashid', 'Dr. Ahmed Al-Rashid'),
    (v_a3, 'Vacina Brucelose B19', v_prod_bruc, 2, 'ml', '2026-02-15', '2026-02-15', 'Dr. Ahmed Al-Rashid', 'Dr. Ahmed Al-Rashid'),
    (v_a4, 'Vacina Brucelose B19', v_prod_bruc, 2, 'ml', '2026-02-15', '2026-02-15', 'Dr. Ahmed Al-Rashid', 'Dr. Ahmed Al-Rashid'),
    (v_a5, 'Vacina Brucelose B19', v_prod_bruc, 2, 'ml', '2026-02-15', '2026-02-15', 'Dr. Ahmed Al-Rashid', 'Dr. Ahmed Al-Rashid'),
    -- Ivermectina
    (v_a1, 'Ivermectina 1%', v_prod_iverm, 10, 'ml', '2026-03-05', '2026-04-04', 'Dr. Ahmed Al-Rashid', 'Dr. Ahmed Al-Rashid'),
    (v_a2, 'Ivermectina 1%', v_prod_iverm, 10, 'ml', '2026-03-05', '2026-04-04', 'Dr. Ahmed Al-Rashid', 'Dr. Ahmed Al-Rashid'),
    (v_a3, 'Ivermectina 1%', v_prod_iverm, 12, 'ml', '2026-03-05', '2026-04-04', 'Dr. Ahmed Al-Rashid', 'Dr. Ahmed Al-Rashid'),
    (v_a4, 'Ivermectina 1%', v_prod_iverm, 11, 'ml', '2026-03-05', '2026-04-04', 'Dr. Ahmed Al-Rashid', 'Dr. Ahmed Al-Rashid'),
    (v_a5, 'Ivermectina 1%', v_prod_iverm, 12, 'ml', '2026-03-05', '2026-04-04', 'Dr. Ahmed Al-Rashid', 'Dr. Ahmed Al-Rashid');

  -- ═══ 6. Certificações (Halal + MAPA-SIF, 2 por animal) ════════════════════
  INSERT INTO animal_certifications (animal_id, certification_code, certification_name, status, issued_at, expires_at) VALUES
    (v_a1, 'CDIAL-HALAL-SAU001', 'Halal',    'active', '2026-01-15', '2027-12-31'),
    (v_a1, 'MAPA-SIF-SAU001',    'MAPA-SIF', 'active', '2026-01-15', '2026-12-31'),
    (v_a2, 'CDIAL-HALAL-SAU002', 'Halal',    'active', '2026-01-15', '2027-12-31'),
    (v_a2, 'MAPA-SIF-SAU002',    'MAPA-SIF', 'active', '2026-01-15', '2026-12-31'),
    (v_a3, 'CDIAL-HALAL-SAU003', 'Halal',    'active', '2026-01-15', '2027-12-31'),
    (v_a3, 'MAPA-SIF-SAU003',    'MAPA-SIF', 'active', '2026-01-15', '2026-12-31'),
    (v_a4, 'CDIAL-HALAL-SAU004', 'Halal',    'active', '2026-01-15', '2027-12-31'),
    (v_a4, 'MAPA-SIF-SAU004',    'MAPA-SIF', 'active', '2026-01-15', '2026-12-31'),
    (v_a5, 'CDIAL-HALAL-SAU005', 'Halal',    'active', '2026-01-15', '2027-12-31'),
    (v_a5, 'MAPA-SIF-SAU005',    'MAPA-SIF', 'active', '2026-01-15', '2026-12-31');

  -- ═══ 7. Lote de exportação ═════════════════════════════════════════════════
  INSERT INTO lots (
    client_id, name, objective, pais_destino, porto_embarque,
    data_embarque, numero_contrato, status, ship_name, arrival_date,
    certificacoes_exigidas
  ) VALUES (
    v_lucas, 'Saudi Premium Export #001', 'Exportação',
    'Saudi Arabia', 'Santos-SP',
    '2026-05-15', 'EXP-SAU-2026-001', 'active',
    'MV Al Salam', '2026-06-20',
    ARRAY['Halal', 'MAPA-SIF']
  ) RETURNING id INTO v_lot;

  -- ═══ 8. Vincula animais ao lote ════════════════════════════════════════════
  INSERT INTO animal_lot_assignments (animal_id, lot_id) VALUES
    (v_a1, v_lot), (v_a2, v_lot), (v_a3, v_lot), (v_a4, v_lot), (v_a5, v_lot);

  -- ═══ 9. Tracking do lote ═══════════════════════════════════════════════════
  INSERT INTO shipment_tracking (client_id, lot_id, stage, timestamp, animals_confirmed, animals_lost, location_name) VALUES
    (v_lucas, v_lot, 'fazenda',       '2026-04-01 08:00:00+00', 5, 0, 'Fazenda Santa Cruz — Goiás'),
    (v_lucas, v_lot, 'concentracao',  '2026-04-05 10:00:00+00', 5, 0, 'Centro de Inspeção Veterinária — Santos'),
    (v_lucas, v_lot, 'porto_origem',  '2026-04-08 14:00:00+00', 5, 0, 'Porto de Santos — Terminal Exportação');

  -- ═══ 10. PIF buyer access ═════════════════════════════════════════════════
  INSERT INTO lot_buyer_access (lot_id, buyer_client_id) VALUES (v_lot, v_pif);

  -- ═══ 11. Comprador SALIC ══════════════════════════════════════════════════
  INSERT INTO buyers (client_id, name, cnpj, type, contact_name, contact_phone, contact_email, notes)
  VALUES (v_lucas, 'SALIC — Saudi Agricultural and Livestock Investment Company', NULL, 'exportador',
    'Mohammed Al-Otaibi', '+966 11 474 9999', 'livestock@salic.com.sa',
    'Subsidiária do PIF — principal compradora de proteína animal brasileira para a Arábia Saudita');

  SET LOCAL session_replication_role = DEFAULT;

  -- ═══ 12. Calcula scores ═══════════════════════════════════════════════════
  PERFORM calculate_agraas_score(v_a1);
  PERFORM calculate_agraas_score(v_a2);
  PERFORM calculate_agraas_score(v_a3);
  PERFORM calculate_agraas_score(v_a4);
  PERFORM calculate_agraas_score(v_a5);

END $$;
