-- Migration 039: Sincroniza coluna lots_count em properties com a contagem real da tabela lots

UPDATE properties
SET lots_count = (
  SELECT COUNT(*)
  FROM lots
  WHERE lots.property_id = properties.id
);
