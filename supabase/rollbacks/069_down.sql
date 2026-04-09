-- Rollback migration 069
DROP POLICY IF EXISTS storage_animal_photos_delete ON storage.objects;
DROP POLICY IF EXISTS storage_animal_photos_insert ON storage.objects;
DROP POLICY IF EXISTS storage_animal_photos_select ON storage.objects;
DROP POLICY IF EXISTS animal_photos_delete ON animal_photos;
DROP POLICY IF EXISTS animal_photos_insert ON animal_photos;
DROP POLICY IF EXISTS animal_photos_select ON animal_photos;
DROP TABLE IF EXISTS animal_photos;
DELETE FROM storage.buckets WHERE id = 'animal-photos';
