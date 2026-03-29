-- Migration 038: Normaliza coluna sex em animals para Male/Female canônico

-- Distribuição ANTES
SELECT sex, COUNT(*) as total
FROM animals
GROUP BY sex
ORDER BY sex;

-- Normalização
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Masculino → Male
  UPDATE animals
  SET sex = 'Male'
  WHERE lower(
    translate(sex,
      'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÇç',
      'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOOooooooUUUUuuuuCc'
    )
  ) IN ('m', 'macho', 'male', 'masculino');

  -- Feminino → Female
  UPDATE animals
  SET sex = 'Female'
  WHERE lower(
    translate(sex,
      'ÀÁÂÃÄÅàáâãäåÈÉÊËèéêëÌÍÎÏìíîïÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÇç',
      'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOOooooooUUUUuuuuCc'
    )
  ) IN ('f', 'femea', 'female', 'feminino');

  -- Loga valores não reconhecidos (fora de Male/Female/null)
  FOR r IN
    SELECT DISTINCT sex, COUNT(*) as total
    FROM animals
    WHERE sex IS NOT NULL AND sex NOT IN ('Male', 'Female')
    GROUP BY sex
  LOOP
    RAISE NOTICE 'Valor de sex não reconhecido mantido: "%" (% registros)', r.sex, r.total;
  END LOOP;
END;
$$;

-- Distribuição DEPOIS
SELECT sex, COUNT(*) as total
FROM animals
GROUP BY sex
ORDER BY sex;
