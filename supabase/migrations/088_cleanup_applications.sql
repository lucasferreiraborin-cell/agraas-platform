-- Migration 088: Cleanup applications — duplicates + null product_name

DO $$
BEGIN
  SET LOCAL session_replication_role = 'replica';

  -- ═══ 1. Delete duplicates (same animal, product, date, dose) ═══════════════
  DELETE FROM applications
   WHERE id NOT IN (
     SELECT MIN(id::text)::uuid FROM applications
     GROUP BY animal_id, COALESCE(product_name, 'NULL'), application_date, COALESCE(dose, 0)
   );

  -- ═══ 2. Backfill product_name from products.name via product_id ═══════════
  UPDATE applications a
     SET product_name = p.name
    FROM products p
   WHERE a.product_id = p.id
     AND (a.product_name IS NULL OR a.product_name = '' OR a.product_name = 'Produto');

  -- ═══ 3. Remaining null product_name → 'Aplicação manual' ══════════════════
  UPDATE applications
     SET product_name = 'Aplicação manual'
   WHERE product_name IS NULL OR product_name = '';

  SET LOCAL session_replication_role = DEFAULT;
END $$;
