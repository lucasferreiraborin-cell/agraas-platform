-- Migration 021 — Copia lat/lng das propriedades do seed 018/019
-- As colunas x/y já têm coords geográficas reais (x=lng, y=lat) para essas propriedades
UPDATE properties SET lat = -17.88, lng = -51.71 WHERE id = '00000000-0000-0002-0001-000000000001'; -- Fazenda Santa Cruz, GO (Lucas)
UPDATE properties SET lat = -21.12, lng = -56.48 WHERE id = '00000000-0000-0002-0001-000000000002'; -- Retiro Bom Jesus, MS (Lucas)
UPDATE properties SET lat = -19.74, lng = -47.93 WHERE id = '00000000-0000-0002-0002-000000000001'; -- Fazenda Boa Esperança, MG (Pedro)
