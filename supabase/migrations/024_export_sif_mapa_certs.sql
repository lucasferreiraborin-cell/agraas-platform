-- Migration 024 — Adiciona SIF (Imperador, Estrela, Atlântico) e MAPA (Estrela)
-- Resultado esperado: 3 aptos / 6 = 50% conformidade no lote exportação

DO $$
DECLARE
  a_imperador uuid := '00000000-0000-0003-0001-000000000001';
  a_estrela   uuid := '00000000-0000-0003-0001-000000000002';
  a_atlantico uuid := '00000000-0000-0003-0001-000000000007';
  today date := CURRENT_DATE;
BEGIN
  EXECUTE 'ALTER TABLE animal_certifications DISABLE TRIGGER USER';

  INSERT INTO animal_certifications (animal_id, certification_code, certification_name, status, issued_at, expires_at)
  VALUES
    (a_imperador, 'SIF-IMP-001', 'SIF', 'active', today - 60, today + 305),
    (a_estrela,   'SIF-EST-001', 'SIF', 'active', today - 60, today + 305),
    (a_estrela,   'MAPA-EST-001', 'MAPA', 'active', today - 55, today + 120),
    (a_atlantico, 'SIF-ATL-001', 'SIF', 'active', today - 60, today + 305)
  ON CONFLICT DO NOTHING;

  EXECUTE 'ALTER TABLE animal_certifications ENABLE TRIGGER USER';
END $$;
