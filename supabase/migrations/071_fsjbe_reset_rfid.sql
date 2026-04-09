-- Migration 071: Reset RFID for FSJBE — fazenda não tem dispositivo
UPDATE animals
SET rfid = null, rfid_device_type = 'brinco_auricular'
WHERE client_id = (SELECT id FROM clients WHERE email = 'fsjdbe@gmail.com');
