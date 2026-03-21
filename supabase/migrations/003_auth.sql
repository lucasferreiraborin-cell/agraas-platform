-- Migration 003: Adiciona auth_user_id na tabela clients para vincular usuários Supabase Auth
-- RLS será ativado em etapa separada após vincular usuários existentes

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_auth_user_id ON clients (auth_user_id);
