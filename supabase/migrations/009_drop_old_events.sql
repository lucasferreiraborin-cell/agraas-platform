-- Migration 009: Remove tabelas antigas de eventos
-- Todos os dados foram migrados para a tabela events (migration 002)
-- animal_events: 24 registros migrados
-- farm_events: 5 registros migrados
-- events: 29 registros confirmados

DROP TABLE IF EXISTS animal_events;
DROP TABLE IF EXISTS farm_events;
