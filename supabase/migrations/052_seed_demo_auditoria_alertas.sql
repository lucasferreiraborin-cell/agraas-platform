-- Migration 052: Seed demo para /auditoria e /alertas (Lucas)
-- audit_snapshot vazio para Lucas → insere snapshot realista
-- stock_batches: adiciona lotes críticos e próximos do vencimento para demo

-- ── audit_snapshot para Lucas ────────────────────────────────────────────────
-- Lucas tem 18 animais ativos após backfill da migration 051.
-- Dados construídos com base no rebanho real.

INSERT INTO audit_snapshot (
  client_id, snapshot_date,
  inventoried_in, inventoried_out,
  movements_in, movements_out,
  not_inventoried_in, not_inventoried_out,
  total_present_in, total_present_out,
  total_stock_in, total_stock_out,
  duplicates, adjustments_inserted, exits_as_adjustment
) VALUES (
  '79c94a7e-b233-4e85-9d72-6d08477c21c9',
  CURRENT_DATE,
  18, 18,   -- inventariados: entrada = saída = estável
  4,  3,    -- com movimentação: 4 entradas, 3 saídas (1 saldo positivo)
  0,  0,    -- não inventariados: zero (rastreabilidade total)
  18, 18,   -- total presentes
  18, 18,   -- estoque total
  0,        -- duplicatas: nenhuma
  0,        -- ajustes inseridos: operação limpa
  0         -- saídas como ajuste: nenhuma
);

DO $$ BEGIN
  RAISE NOTICE 'audit_snapshot para Lucas inserido com sucesso.';
END $$;

-- ── Produto adicional para alertas de vencimento ──────────────────────────────
INSERT INTO products (id, name, product_type, withdrawal_days, created_at)
VALUES (
  '11111111-0000-0000-0000-000000000001',
  'Vitamina ADE Complex',
  'Suplemento',
  14,
  now()
) ON CONFLICT (id) DO NOTHING;

-- ── stock_batches críticos (qty ≤ 5) ─────────────────────────────────────────
-- Ivermectina: lote quase zerado
INSERT INTO stock_batches (product_id, batch_number, expiration_date, quantity, quantity_received, entry_date)
VALUES (
  '54e83744-2ca9-4d05-b883-d99928871716',  -- Ivermectina
  'LOTE-IVE-002',
  '2027-06-30',
  2,
  50,
  CURRENT_DATE - 60
) ON CONFLICT DO NOTHING;

-- Vacina Brucelose: estoque crítico
INSERT INTO stock_batches (product_id, batch_number, expiration_date, quantity, quantity_received, entry_date)
VALUES (
  '5f60b415-ddbe-4a95-8756-e48088d6120d',  -- Vacina Brucelose
  'LOTE-VAC-003',
  '2027-03-15',
  4,
  30,
  CURRENT_DATE - 45
) ON CONFLICT DO NOTHING;

-- Vitamina ADE: vencendo em ~18 dias (dentro da janela de 30 dias do alerta)
INSERT INTO stock_batches (product_id, batch_number, expiration_date, quantity, quantity_received, entry_date)
VALUES (
  '11111111-0000-0000-0000-000000000001',  -- Vitamina ADE Complex
  'LOTE-VIT-001',
  CURRENT_DATE + 18,
  25,
  25,
  CURRENT_DATE - 90
) ON CONFLICT DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE 'stock_batches demo inseridos: 2 críticos + 1 vencendo em 18 dias.';
END $$;
