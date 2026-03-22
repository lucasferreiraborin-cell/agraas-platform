-- Migration 012: Campos adicionais na tabela animals
-- Adiciona campos para o formulário completo de cadastro

ALTER TABLE animals
  ADD COLUMN IF NOT EXISTS nickname       text,
  ADD COLUMN IF NOT EXISTS rfid           text,
  ADD COLUMN IF NOT EXISTS birth_weight   numeric,
  ADD COLUMN IF NOT EXISTS notes          text,
  ADD COLUMN IF NOT EXISTS category       text,
  ADD COLUMN IF NOT EXISTS blood_type     text,
  ADD COLUMN IF NOT EXISTS sire_animal_id uuid REFERENCES animals(id),
  ADD COLUMN IF NOT EXISTS dam_animal_id  uuid REFERENCES animals(id);
