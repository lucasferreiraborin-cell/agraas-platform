-- Rollback da 160 (B0c): remove da canônica só os alertas que a migração
-- copiou da tabela legada — identificados pelo texto fixo de suggested_action.
-- Alertas gerados ao vivo pelo alert-writer (B0c) não têm esse texto e ficam.
BEGIN;

DELETE FROM public.fiscal_alerts
WHERE suggested_action = 'Alerta migrado da tabela legada em 05/09/2026 (B0c). Conferir com o contador.';

COMMIT;
