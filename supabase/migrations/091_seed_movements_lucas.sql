-- Migration 091: Seed 20 movimentações demo para Lucas

DO $$
DECLARE
  v_lucas uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_animals uuid[];
  v_count int;
BEGIN
  SET LOCAL session_replication_role = 'replica';

  -- Coleta animais ativos do Lucas
  SELECT array_agg(id) INTO v_animals
    FROM animals
   WHERE client_id = v_lucas
     AND COALESCE(status, 'Ativo') = 'Ativo';

  v_count := COALESCE(array_length(v_animals, 1), 0);

  IF v_count = 0 THEN
    RAISE NOTICE 'Sem animais para Lucas — pulando seed';
    RETURN;
  END IF;

  -- Limpa movimentações antigas para evitar duplicação no demo
  DELETE FROM animal_movements WHERE animal_id = ANY(v_animals);

  -- 8 transferências entre piquetes
  INSERT INTO animal_movements (animal_id, movement_type, origin_ref, destination_ref, movement_date, notes)
  SELECT
    v_animals[1 + (i % v_count)],
    'ownership_transfer',
    (ARRAY['Pasto Norte','Pasto Sul','Pasto Leste','Pasto Oeste','Curral Manejo'])[1 + (i % 5)],
    (ARRAY['Pasto Sul','Pasto Norte','Pasto Bezerros','Pasto Recria','Pasto Engorda'])[1 + (i % 5)],
    (CURRENT_DATE - ((random() * 90)::int))::date,
    'Rotação de pastagem programada'
  FROM generate_series(0, 7) AS i;

  -- 5 nascimentos
  INSERT INTO animal_movements (animal_id, movement_type, origin_ref, destination_ref, movement_date, notes)
  SELECT
    v_animals[1 + (i % v_count)],
    'birth',
    'Maternidade',
    'Pasto Bezerros',
    (CURRENT_DATE - ((random() * 90)::int))::date,
    'Bezerro nascido sem intercorrências'
  FROM generate_series(0, 4) AS i;

  -- 4 saídas de venda
  INSERT INTO animal_movements (animal_id, movement_type, origin_ref, destination_ref, movement_date, notes)
  SELECT
    v_animals[1 + (i % v_count)],
    'sale',
    'Curral Embarque',
    'Frigorífico Goiás',
    (CURRENT_DATE - ((random() * 90)::int))::date,
    'Lote de venda — peso ideal de abate'
  FROM generate_series(0, 3) AS i;

  -- 3 movimentações sanitárias
  INSERT INTO animal_movements (animal_id, movement_type, origin_ref, destination_ref, movement_date, notes)
  SELECT
    v_animals[1 + (i % v_count)],
    'sanitary',
    'Pasto Norte',
    'Curral Tratamento',
    (CURRENT_DATE - ((random() * 90)::int))::date,
    'Movimentação para aplicação de vermífugo'
  FROM generate_series(0, 2) AS i;

  SET LOCAL session_replication_role = DEFAULT;

  RAISE NOTICE 'Seed 091: 20 movimentações inseridas para % animais', v_count;
END $$;
