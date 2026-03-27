-- Adiciona score_status = 'current' e score_version = 'v1' nos score_json
-- de todos os animais dos clientes pauloborin@agraas.com.br e fsjdbe@gmail.com
-- para que a view agraas_master_passport os reconheça como scores válidos.

UPDATE agraas_master_passport_cache
SET score_json = score_json
  || jsonb_build_object(
       'score_status',  'current',
       'score_version', 'v1',
       'last_updated',  NOW()::text
     )
WHERE client_id IN (
  SELECT id FROM clients
  WHERE email IN ('pauloborin@agraas.com.br', 'fsjdbe@gmail.com')
)
AND (
  score_json->>'score_status' IS NULL
  OR score_json->>'score_status' != 'current'
);
