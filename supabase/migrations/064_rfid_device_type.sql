-- Migration 064: rfid_device_type em animals e livestock_species
-- Adiciona suporte a bolus intra-ruminal ISO 11784/11785 e outros dispositivos RFID

CREATE TYPE rfid_device_type_enum AS ENUM (
  'brinco_auricular',
  'bolus_intra_ruminal',
  'subcutaneo',
  'outro'
);

ALTER TABLE animals
  ADD COLUMN IF NOT EXISTS rfid_device_type rfid_device_type_enum NOT NULL DEFAULT 'brinco_auricular';

ALTER TABLE livestock_species
  ADD COLUMN IF NOT EXISTS rfid_device_type rfid_device_type_enum NOT NULL DEFAULT 'brinco_auricular';

-- Seed: animais demo de Lucas → bolus_intra_ruminal
UPDATE animals
SET rfid_device_type = 'bolus_intra_ruminal'
WHERE client_id = (SELECT id FROM clients WHERE email = 'lucas@agraas.com.br')
  AND rfid IS NOT NULL;
