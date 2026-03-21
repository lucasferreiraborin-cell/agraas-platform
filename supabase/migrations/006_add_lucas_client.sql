-- Migration 006: Adiciona cliente Lucas vinculado ao usuário Auth
INSERT INTO clients (id, name, email, auth_user_id)
VALUES (
  gen_random_uuid(),
  'Lucas',
  'lucas@agraas.com.br',
  '816a377b-1336-4c10-b4fc-35b675fe4596'
)
ON CONFLICT DO NOTHING;
