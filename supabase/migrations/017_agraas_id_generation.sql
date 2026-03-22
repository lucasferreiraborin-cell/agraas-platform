-- Migration 017: Geração automática de agraas_id com prefixo AGR-

-- Adiciona coluna agraas_id se não existir
ALTER TABLE animals ADD COLUMN IF NOT EXISTS agraas_id text;

-- Cria índice único se não existir
CREATE UNIQUE INDEX IF NOT EXISTS animals_agraas_id_unique ON animals (agraas_id) WHERE agraas_id IS NOT NULL;

-- Função para gerar AGR-XXXXXXXX (8 chars maiúsculos alfanuméricos)
CREATE OR REPLACE FUNCTION generate_agraas_id() RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := 'AGR-';
  i int;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Backfill animais existentes sem agraas_id
DO $$
DECLARE
  rec RECORD;
  new_id text;
  attempts int;
BEGIN
  FOR rec IN SELECT id FROM animals WHERE agraas_id IS NULL LOOP
    attempts := 0;
    LOOP
      new_id := generate_agraas_id();
      attempts := attempts + 1;
      BEGIN
        UPDATE animals SET agraas_id = new_id WHERE id = rec.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        IF attempts > 10 THEN RAISE EXCEPTION 'Não conseguiu gerar agraas_id único'; END IF;
      END;
    END LOOP;
  END LOOP;
END;
$$;

-- Trigger para novos animais
CREATE OR REPLACE FUNCTION set_agraas_id() RETURNS TRIGGER AS $$
DECLARE
  new_id text;
  attempts int := 0;
BEGIN
  IF NEW.agraas_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  LOOP
    new_id := generate_agraas_id();
    attempts := attempts + 1;
    BEGIN
      NEW.agraas_id := new_id;
      RETURN NEW;
    EXCEPTION WHEN unique_violation THEN
      IF attempts > 10 THEN RAISE EXCEPTION 'Não conseguiu gerar agraas_id único'; END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_agraas_id ON animals;
CREATE TRIGGER trg_set_agraas_id
  BEFORE INSERT ON animals
  FOR EACH ROW EXECUTE FUNCTION set_agraas_id();

-- Policy de leitura pública via agraas_id (para a página pública de passaporte)
-- A página usa service_role, mas por segurança também abrimos leitura de campos básicos pelo anon
-- Nota: a página /passaporte usa service_role key no servidor, então não depende desta policy
