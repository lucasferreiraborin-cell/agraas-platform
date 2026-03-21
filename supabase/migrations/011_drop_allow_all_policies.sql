-- Migration 011: Remove políticas allow_all_* que sobrepõem o RLS real
-- Mantém apenas as policies _access criadas na migration 010

-- ANIMALS
DROP POLICY IF EXISTS "allow_all_select" ON animals;
DROP POLICY IF EXISTS "allow_all_insert" ON animals;
DROP POLICY IF EXISTS "allow_all_update" ON animals;
DROP POLICY IF EXISTS "temp_public_read_animals" ON animals;
DROP POLICY IF EXISTS "animals_read_same_property" ON animals;
DROP POLICY IF EXISTS "animals_update_same_property" ON animals;
DROP POLICY IF EXISTS "animals_insert_same_property" ON animals;

-- PROPERTIES
DROP POLICY IF EXISTS "allow_all_select" ON properties;
DROP POLICY IF EXISTS "allow_all_insert" ON properties;
DROP POLICY IF EXISTS "allow_all_update" ON properties;

-- AGRAAS_MASTER_PASSPORT_CACHE
DROP POLICY IF EXISTS "allow_all_select" ON agraas_master_passport_cache;
DROP POLICY IF EXISTS "allow_all_insert" ON agraas_master_passport_cache;
DROP POLICY IF EXISTS "allow_all_update" ON agraas_master_passport_cache;
DROP POLICY IF EXISTS "Public read passport cache" ON agraas_master_passport_cache;
DROP POLICY IF EXISTS "allow_read_agraas_master_passport_cache" ON agraas_master_passport_cache;
DROP POLICY IF EXISTS "allow_update_agraas_master_passport_cache" ON agraas_master_passport_cache;
DROP POLICY IF EXISTS "allow_insert_agraas_master_passport_cache" ON agraas_master_passport_cache;

-- APPLICATIONS
DROP POLICY IF EXISTS "allow_all_select" ON applications;
DROP POLICY IF EXISTS "allow_all_insert" ON applications;
DROP POLICY IF EXISTS "allow_all_update" ON applications;
DROP POLICY IF EXISTS "allow_read_applications" ON applications;
DROP POLICY IF EXISTS "temp_public_read_applications" ON applications;

-- WEIGHTS
DROP POLICY IF EXISTS "allow_all_select" ON weights;
DROP POLICY IF EXISTS "allow_all_insert" ON weights;
DROP POLICY IF EXISTS "allow_all_update" ON weights;
DROP POLICY IF EXISTS "allow_read_weights" ON weights;
DROP POLICY IF EXISTS "allow_update_weights" ON weights;
DROP POLICY IF EXISTS "allow_insert_weights" ON weights;

-- ANIMAL_MOVEMENTS
DROP POLICY IF EXISTS "allow_all_select" ON animal_movements;
DROP POLICY IF EXISTS "allow_all_insert" ON animal_movements;
DROP POLICY IF EXISTS "allow_all_update" ON animal_movements;
DROP POLICY IF EXISTS "allow_read_animal_movements" ON animal_movements;
DROP POLICY IF EXISTS "allow_update_animal_movements" ON animal_movements;
DROP POLICY IF EXISTS "allow_insert_animal_movements" ON animal_movements;

-- ANIMAL_CERTIFICATIONS
DROP POLICY IF EXISTS "allow_all_select" ON animal_certifications;
DROP POLICY IF EXISTS "allow_all_insert" ON animal_certifications;
DROP POLICY IF EXISTS "allow_all_update" ON animal_certifications;
DROP POLICY IF EXISTS "temp_public_read_certifications" ON animal_certifications;
DROP POLICY IF EXISTS "animal_certifications_select_same_property" ON animal_certifications;
DROP POLICY IF EXISTS "animal_certifications_update_same_property" ON animal_certifications;
DROP POLICY IF EXISTS "animal_certifications_insert_same_property" ON animal_certifications;
