-- Rollback migration 114
-- Nota: o DROP da trigger órfã trg_create_animal_birth_event NÃO é revertido.
-- Ela apontava pra tabela legacy animal_events removida em 2024 (migration 049).
-- Restaurar é tecnicamente impossível e semanticamente errado (a função tentava
-- usar uma tabela que não existe). Se quiser registro de nascimento, criar nova
-- trigger apontando pra tabela `events` em migration própria.

BEGIN;

DELETE FROM public.reproductive_seasons
  WHERE id = '44444444-0099-0000-0000-000000000001';

DELETE FROM public.animal_lot_assignments
  WHERE animal_id::text LIKE '33333333-0099-%';

DELETE FROM public.animals
  WHERE id::text LIKE '33333333-0099-%';

DELETE FROM public.lots
  WHERE id::text LIKE '22222222-0099-%';

DELETE FROM public.properties
  WHERE id = '11111111-0099-0000-0000-000000000001';

COMMIT;
