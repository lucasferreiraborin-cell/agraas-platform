-- Migration 098: Cotações CEPEA faltantes em platform_settings

INSERT INTO platform_settings (key, value, updated_at) VALUES
  ('cotacao_boi_gordo',       '330',  now()),
  ('cotacao_bezerro',         '2800', now()),
  ('cotacao_vaca_gorda',      '290',  now()),
  ('cotacao_novilho_precoce', '340',  now())
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = now();
