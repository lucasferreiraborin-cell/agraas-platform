-- 130_fiscal_update_with_check
-- Aplicada em producao via MCP em 2026-06-23 (project ixuxawcgwhrrrnwendxr).
-- Impede que um cliente "reetiquete" uma nota fiscal para outro cliente via UPDATE
-- (policies de UPDATE tinham USING mas nao WITH CHECK). Agora a linha resultante
-- precisa continuar pertencendo ao mesmo tenant.
alter policy fiscal_notes_update on public.fiscal_notes
  with check (is_admin() or client_id = get_my_client_id());
alter policy cfn_update on public.crop_fiscal_notes
  with check (is_admin() or client_id = get_my_client_id());
alter policy cfni_update on public.crop_fiscal_note_items
  with check (is_admin() or client_id = get_my_client_id());
