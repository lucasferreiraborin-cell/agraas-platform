-- Rollback migration 118

BEGIN;

DELETE FROM public.mentor_assignments
WHERE user_id = '36628211-da18-408b-9f98-a318a47715bd'
  AND client_id = '00000000-0000-0000-0003-000000000001';

COMMIT;
