-- Migration 090: Cleanup suppliers + products + MAPA registry

DO $$
DECLARE
  v_lucas      uuid := '79c94a7e-b233-4e85-9d72-6d08477c21c9';
  v_lucas_elanco uuid;
BEGIN
  SET LOCAL session_replication_role = 'replica';

  -- ═══ 1. Remove suppliers do FSJBE (cliente piloto sem operação) ═══════════
  -- Mantém apenas os do Lucas. FSJBE pode recriar quando importar dados reais.
  DELETE FROM suppliers
   WHERE client_id = '00000000-0000-0000-0003-000000000001';

  -- ═══ 2. Vincula produtos sem supplier_id ao Elanco do Lucas ═══════════════
  SELECT id INTO v_lucas_elanco FROM suppliers
   WHERE client_id = v_lucas AND name = 'Elanco' LIMIT 1;

  IF v_lucas_elanco IS NOT NULL THEN
    UPDATE products
       SET supplier_id = v_lucas_elanco
     WHERE client_id = v_lucas
       AND supplier_id IS NULL
       AND (category = 'medicamento' OR LOWER(name) LIKE '%dectomax%' OR LOWER(name) LIKE '%bimectin%');
  END IF;

  -- ═══ 3. Cleanup products ═════════════════════════════════════════════════
  -- Remove Dectomax duplicado (mantém o de menor id)
  DELETE FROM products
   WHERE name = 'Dectomax'
     AND id NOT IN (SELECT MIN(id::text)::uuid FROM products WHERE name = 'Dectomax');

  -- Remove Ivermectina sem fornecedor e categoria
  DELETE FROM products
   WHERE name = 'Ivermectina' AND supplier_id IS NULL AND category IS NULL;

  -- ═══ 4. Adiciona coluna notes (registro MAPA) ════════════════════════════
  ALTER TABLE products ADD COLUMN IF NOT EXISTS notes text;

  UPDATE products SET notes = 'MAPA-034.06.001' WHERE name = 'Bimectin';
  UPDATE products SET notes = 'MAPA-034.05.002' WHERE name = 'Dectomax';
  UPDATE products SET notes = 'MAPA-034.03.001' WHERE name = 'Ivermectina 1%';
  UPDATE products SET notes = 'MAPA-001.01.001' WHERE name = 'Vacina Aftosa';
  UPDATE products SET notes = 'MAPA-001.02.001' WHERE name = 'Vacina Brucelose B19';

  SET LOCAL session_replication_role = DEFAULT;
END $$;
