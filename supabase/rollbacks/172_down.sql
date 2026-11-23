-- Rollback da 172 (mini ERP v0). Apaga os dados das três tabelas.
BEGIN;
DROP TABLE IF EXISTS public.abastecimentos;
DROP TABLE IF EXISTS public.maquinas;
DROP TABLE IF EXISTS public.titulos_financeiros;
DROP TABLE IF EXISTS public.centros_custo;
COMMIT;
