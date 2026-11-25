-- Rollback da 176 (apelidos de produto). Apaga só os nomes de nota confirmados
-- (índices e policy caem junto com a tabela). `products`, notas e itens
-- fiscais não são tocados.
BEGIN;
DROP TABLE IF EXISTS public.produto_apelidos;
COMMIT;
