-- Migration 050: Sincroniza lots_count em properties para TODOS os clientes
-- Garante que a coluna estática lots_count reflete o número real de lotes
-- vinculados a cada propriedade, independente do cliente.

UPDATE properties p
SET lots_count = (
  SELECT COUNT(*)
  FROM lots l
  WHERE l.property_id = p.id
);

-- Confirma: exibe propriedades com lots_count > 0 após update
DO $$
DECLARE
  v_updated bigint;
BEGIN
  SELECT COUNT(*) INTO v_updated
  FROM properties
  WHERE lots_count > 0;

  RAISE NOTICE 'lots_count sincronizado. Propriedades com lotes: %', v_updated;
END $$;
