-- ============================================================================
-- 172 · Mini ERP v0: centros de custo multiatividade, títulos, máquinas, abastecimentos
-- ============================================================================
-- Direção discutida com a iBoi em 17/11/2026 (D-13): nota → conta a pagar →
-- custo → contábil, operável por duas pessoas, mais controle de diesel/frota.
--
-- Só ADITIVA: três tabelas novas, nenhuma alteração em tabela existente.
--   titulos_financeiros — contas a pagar e a receber, com vencimento e baixa.
--     Origem típica: parcelas (<cobr><dup>) da NF-e; também lançamento manual.
--   maquinas            — frota (trator, caminhonete, colheitadeira...).
--   abastecimentos      — litros por máquina, com horímetro/odômetro e custo.
--     A origem "tag" fica prevista para as tags de abastecimento (iBoi).
--
-- Multiatividade (decisão do Lucas, 23/11/2026): pecuária E agricultura, várias
-- culturas e criações. O núcleo é o CENTRO DE CUSTO — toda nota, título e
-- abastecimento cai num centro, e cada centro pertence a uma ATIVIDADE.
--   centros_custo — lote de animais, talhão-safra, galpão, máquina,
--     administrativo... com atividade (bovino de corte, leite, ovinos, aves,
--     grãos, café, hortifrúti...). Liga opcionalmente às tabelas de domínio
--     que já existem (lots, crop_fields) sem duplicá-las.
-- Fiscal (FUNRURAL, LCDPR, IBS/CBS) é o mesmo para todas as atividades rurais;
-- muda só a unidade operacional — por isso um núcleo, não um produto por cultura.
--
-- RLS: client_id + is_admin() OR client_id = get_my_client_id() (padrão 010).
-- NÃO APLICAR sem ordem expressa do Lucas (regra de casa D-10).
-- Rollback: supabase/rollbacks/172_down.sql
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.centros_custo (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  nome          text NOT NULL,
  tipo          text NOT NULL
                CHECK (tipo IN ('lote_animal','talhao','galpao','maquina','benfeitoria','administrativo','outro')),
  atividade     text NOT NULL
                CHECK (atividade IN ('bovino_corte','bovino_leite','ovinos','caprinos','suinos','aves',
                                     'graos','cafe','cana','hortifruti','fruticultura','florestal',
                                     'geral','outra')),
  cultura       text,          -- soja, milho, batata... ou raça/categoria na pecuária
  safra         text,          -- '2026/27' para agricultura; null na pecuária contínua
  area_ha       numeric(12,2),
  cabecas       integer,
  property_id   uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  crop_field_id uuid REFERENCES public.crop_fields(id) ON DELETE SET NULL,
  ativo         boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS centros_custo_client_idx ON public.centros_custo (client_id, atividade);

CREATE TABLE IF NOT EXISTS public.titulos_financeiros (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tipo              text NOT NULL CHECK (tipo IN ('pagar','receber')),
  descricao         text NOT NULL,
  contraparte_nome  text,
  contraparte_doc   text,
  numero_parcela    text,
  valor             numeric(14,2) NOT NULL CHECK (valor > 0),
  vencimento        date NOT NULL,
  status            text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','pago','cancelado')),
  data_baixa        date,
  valor_baixa       numeric(14,2),
  forma_pagamento   text,
  bank_account_id   uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  centro_custo_id   uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  conta_contabil_id uuid REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  fiscal_invoice_id uuid REFERENCES public.fiscal_invoices(id) ON DELETE SET NULL,
  fiscal_note_id    uuid REFERENCES public.fiscal_notes(id) ON DELETE SET NULL,  -- fluxo legado (FISCAL_WRITE_MODE=legacy)
  origem            text NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual','nfe','planilha')),
  -- 'custo' entra no resultado na competência; 'estoque' (ex.: diesel) só no consumo,
  -- para não contar duas vezes; 'investimento' e 'financeiro' ficam fora do custo.
  -- Só tem efeito em títulos a PAGAR; em 'receber' o valor é ignorado.
  natureza          text NOT NULL DEFAULT 'custo' CHECK (natureza IN ('custo','estoque','investimento','financeiro')),
  notas             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT titulo_baixa_coerente CHECK (
    (status = 'pago' AND data_baixa IS NOT NULL) OR status <> 'pago'
  )
);

-- Mesma parcela da mesma nota não entra duas vezes (reimportação idempotente).
-- NULLS NOT DISTINCT (PG15+): nota sem <dup> pode gravar numero_parcela NULL;
-- sem isso, dois NULL contam como distintos e a reimportação duplicaria o título.
CREATE UNIQUE INDEX IF NOT EXISTS titulos_nfe_parcela_uniq
  ON public.titulos_financeiros (fiscal_invoice_id, numero_parcela) NULLS NOT DISTINCT
  WHERE fiscal_invoice_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS titulos_nfe_legado_parcela_uniq
  ON public.titulos_financeiros (fiscal_note_id, numero_parcela) NULLS NOT DISTINCT
  WHERE fiscal_note_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS titulos_client_venc_idx
  ON public.titulos_financeiros (client_id, status, vencimento);
-- FK sem índice vira seq scan no ON DELETE SET NULL e no "custo por centro".
CREATE INDEX IF NOT EXISTS titulos_centro_idx
  ON public.titulos_financeiros (centro_custo_id) WHERE centro_custo_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.maquinas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  nome          text NOT NULL,
  tipo          text NOT NULL DEFAULT 'trator'
                CHECK (tipo IN ('trator','caminhonete','caminhao','colheitadeira','pulverizador','moto','outro')),
  placa_ou_serie text,
  medidor       text NOT NULL DEFAULT 'horimetro' CHECK (medidor IN ('horimetro','odometro')),
  ativo         boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS maquinas_client_idx ON public.maquinas (client_id);

CREATE TABLE IF NOT EXISTS public.abastecimentos (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  maquina_id        uuid NOT NULL REFERENCES public.maquinas(id) ON DELETE CASCADE,
  data              date NOT NULL,
  litros            numeric(12,2) NOT NULL CHECK (litros > 0),
  preco_litro       numeric(10,4),
  medidor_leitura   numeric(12,1),
  operador          text,
  centro_custo_id   uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  origem            text NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual','tag','planilha')),
  fiscal_invoice_id uuid REFERENCES public.fiscal_invoices(id) ON DELETE SET NULL,
  notas             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS abastecimentos_client_data_idx ON public.abastecimentos (client_id, data);
CREATE INDEX IF NOT EXISTS abastecimentos_maquina_idx ON public.abastecimentos (maquina_id, data);
CREATE INDEX IF NOT EXISTS abastecimentos_centro_idx
  ON public.abastecimentos (centro_custo_id) WHERE centro_custo_id IS NOT NULL;

-- updated_at
DROP TRIGGER IF EXISTS trg_titulos_updated_at ON public.titulos_financeiros;
CREATE TRIGGER trg_titulos_updated_at BEFORE UPDATE ON public.titulos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- RLS
ALTER TABLE public.centros_custo       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.titulos_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maquinas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abastecimentos      ENABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS: sem isso a migration falha na 2ª execução (idempotência).
-- ATENÇÃO para as telas: is_admin() enxerga TODOS os clientes. A conta demo do
-- Lucas é admin, então toda query do portal precisa de .eq('client_id', clientId)
-- — a RLS sozinha não isola o admin.
-- WITH CHECK também amarra as referências ao mesmo cliente: FK não passa por RLS,
-- então sem isso um título poderia apontar para centro/nota de outro cliente.
DROP POLICY IF EXISTS centros_custo_access ON public.centros_custo;
CREATE POLICY centros_custo_access ON public.centros_custo FOR ALL
  USING (is_admin() OR client_id = get_my_client_id())
  WITH CHECK (is_admin() OR client_id = get_my_client_id());

DROP POLICY IF EXISTS titulos_access ON public.titulos_financeiros;
CREATE POLICY titulos_access ON public.titulos_financeiros FOR ALL
  USING (is_admin() OR client_id = get_my_client_id())
  WITH CHECK (
    (is_admin() OR client_id = get_my_client_id())
    AND (centro_custo_id IS NULL OR centro_custo_id IN
          (SELECT c.id FROM public.centros_custo c WHERE c.client_id = titulos_financeiros.client_id))
    AND (fiscal_invoice_id IS NULL OR fiscal_invoice_id IN
          (SELECT f.id FROM public.fiscal_invoices f WHERE f.client_id = titulos_financeiros.client_id))
    AND (fiscal_note_id IS NULL OR fiscal_note_id IN
          (SELECT n.id FROM public.fiscal_notes n WHERE n.client_id = titulos_financeiros.client_id))
  );

DROP POLICY IF EXISTS maquinas_access ON public.maquinas;
CREATE POLICY maquinas_access ON public.maquinas FOR ALL
  USING (is_admin() OR client_id = get_my_client_id())
  WITH CHECK (is_admin() OR client_id = get_my_client_id());

DROP POLICY IF EXISTS abastecimentos_access ON public.abastecimentos;
CREATE POLICY abastecimentos_access ON public.abastecimentos FOR ALL
  USING (is_admin() OR client_id = get_my_client_id())
  WITH CHECK (
    (is_admin() OR client_id = get_my_client_id())
    AND maquina_id IN (SELECT m.id FROM public.maquinas m WHERE m.client_id = abastecimentos.client_id)
    AND (centro_custo_id IS NULL OR centro_custo_id IN
          (SELECT c.id FROM public.centros_custo c WHERE c.client_id = abastecimentos.client_id))
  );

COMMIT;
