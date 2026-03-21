-- Migration 008: Ativa RLS na tabela clients
-- Cada usuário só vê e edita seu próprio registro

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients: usuário acessa apenas seu próprio registro"
ON clients
FOR ALL
USING (auth_user_id = auth.uid());
