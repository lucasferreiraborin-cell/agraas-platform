-- Migration 069: Animal photos — Storage bucket + table + RLS + policies

-- ── 1. Storage bucket ───────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'animal-photos',
  'animal-photos',
  false,
  5242880,  -- 5 MB
  ARRAY['image/jpeg','image/png','image/webp']
) ON CONFLICT (id) DO NOTHING;

-- ── 2. Table ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS animal_photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id    uuid NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  client_id    uuid NOT NULL REFERENCES clients(id),
  storage_path text NOT NULL,
  file_name    text NOT NULL,
  file_size    int  NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_animal_photos_animal ON animal_photos(animal_id);
CREATE INDEX IF NOT EXISTS idx_animal_photos_client ON animal_photos(client_id);

-- ── 3. RLS on table ─────────────────────────────────────────────────────────
ALTER TABLE animal_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY animal_photos_select ON animal_photos FOR SELECT
  USING (is_admin() OR client_id = get_my_client_id());

CREATE POLICY animal_photos_insert ON animal_photos FOR INSERT
  WITH CHECK (is_admin() OR client_id = get_my_client_id());

CREATE POLICY animal_photos_delete ON animal_photos FOR DELETE
  USING (is_admin() OR client_id = get_my_client_id());

-- ── 4. Storage policies ─────────────────────────────────────────────────────
-- Users can read their own photos
CREATE POLICY storage_animal_photos_select ON storage.objects FOR SELECT
  USING (
    bucket_id = 'animal-photos'
    AND (auth.role() = 'service_role' OR (storage.foldername(name))[1] = (SELECT id::text FROM clients WHERE auth_user_id = auth.uid()))
  );

-- Users can upload to their own folder
CREATE POLICY storage_animal_photos_insert ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'animal-photos'
    AND (auth.role() = 'service_role' OR (storage.foldername(name))[1] = (SELECT id::text FROM clients WHERE auth_user_id = auth.uid()))
  );

-- Users can delete their own photos
CREATE POLICY storage_animal_photos_delete ON storage.objects FOR DELETE
  USING (
    bucket_id = 'animal-photos'
    AND (auth.role() = 'service_role' OR (storage.foldername(name))[1] = (SELECT id::text FROM clients WHERE auth_user_id = auth.uid()))
  );
