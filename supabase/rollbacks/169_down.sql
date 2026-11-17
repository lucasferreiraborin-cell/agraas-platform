-- 169_down · Recria as 15 policies `*_same_property` e reabre users_profile.
-- Expressões copiadas de pg_policies em 16/11/2026, antes da 169.
-- Reabre o furo de isolamento — só usar se a 169 quebrar algo legítimo.

BEGIN;

GRANT ALL ON TABLE public.users_profile TO anon;
GRANT ALL ON TABLE public.users_profile TO authenticated;

CREATE POLICY users_profile_insert_own ON public.users_profile FOR INSERT TO public
  WITH CHECK ((auth_user_id = auth.uid()) OR is_admin());
CREATE POLICY users_profile_update_own ON public.users_profile FOR UPDATE TO public
  USING ((auth_user_id = auth.uid()) OR is_admin())
  WITH CHECK ((auth_user_id = auth.uid()) OR is_admin());

-- animal_scores / animal_seals / slaughter_records: por animal → propriedade
CREATE POLICY animal_scores_select_same_property ON public.animal_scores FOR SELECT TO authenticated
  USING (animal_id IN (SELECT a.id FROM animals a JOIN users_profile u ON u.property_id = a.current_property_id WHERE u.auth_user_id = auth.uid()));
CREATE POLICY animal_scores_insert_same_property ON public.animal_scores FOR INSERT TO authenticated
  WITH CHECK (animal_id IN (SELECT a.id FROM animals a JOIN users_profile u ON u.property_id = a.current_property_id WHERE u.auth_user_id = auth.uid()));
CREATE POLICY animal_scores_update_same_property ON public.animal_scores FOR UPDATE TO authenticated
  USING (animal_id IN (SELECT a.id FROM animals a JOIN users_profile u ON u.property_id = a.current_property_id WHERE u.auth_user_id = auth.uid()))
  WITH CHECK (animal_id IN (SELECT a.id FROM animals a JOIN users_profile u ON u.property_id = a.current_property_id WHERE u.auth_user_id = auth.uid()));

CREATE POLICY animal_seals_select_same_property ON public.animal_seals FOR SELECT TO authenticated
  USING (animal_id IN (SELECT a.id FROM animals a JOIN users_profile u ON u.property_id = a.current_property_id WHERE u.auth_user_id = auth.uid()));
CREATE POLICY animal_seals_insert_same_property ON public.animal_seals FOR INSERT TO authenticated
  WITH CHECK (animal_id IN (SELECT a.id FROM animals a JOIN users_profile u ON u.property_id = a.current_property_id WHERE u.auth_user_id = auth.uid()));
CREATE POLICY animal_seals_update_same_property ON public.animal_seals FOR UPDATE TO authenticated
  USING (animal_id IN (SELECT a.id FROM animals a JOIN users_profile u ON u.property_id = a.current_property_id WHERE u.auth_user_id = auth.uid()))
  WITH CHECK (animal_id IN (SELECT a.id FROM animals a JOIN users_profile u ON u.property_id = a.current_property_id WHERE u.auth_user_id = auth.uid()));

CREATE POLICY slaughter_records_select_same_property ON public.slaughter_records FOR SELECT TO authenticated
  USING (animal_id IN (SELECT a.id FROM animals a JOIN users_profile u ON u.property_id = a.current_property_id WHERE u.auth_user_id = auth.uid()));
CREATE POLICY slaughter_records_insert_same_property ON public.slaughter_records FOR INSERT TO authenticated
  WITH CHECK (animal_id IN (SELECT a.id FROM animals a JOIN users_profile u ON u.property_id = a.current_property_id WHERE u.auth_user_id = auth.uid()));
CREATE POLICY slaughter_records_update_same_property ON public.slaughter_records FOR UPDATE TO authenticated
  USING (animal_id IN (SELECT a.id FROM animals a JOIN users_profile u ON u.property_id = a.current_property_id WHERE u.auth_user_id = auth.uid()))
  WITH CHECK (animal_id IN (SELECT a.id FROM animals a JOIN users_profile u ON u.property_id = a.current_property_id WHERE u.auth_user_id = auth.uid()));

-- batch_lots: por propriedade direta
CREATE POLICY batch_lots_select_same_property ON public.batch_lots FOR SELECT TO authenticated
  USING (property_id IN (SELECT users_profile.property_id FROM users_profile WHERE users_profile.auth_user_id = auth.uid()));
CREATE POLICY batch_lots_insert_same_property ON public.batch_lots FOR INSERT TO authenticated
  WITH CHECK (property_id IN (SELECT users_profile.property_id FROM users_profile WHERE users_profile.auth_user_id = auth.uid()));
CREATE POLICY batch_lots_update_same_property ON public.batch_lots FOR UPDATE TO authenticated
  USING (property_id IN (SELECT users_profile.property_id FROM users_profile WHERE users_profile.auth_user_id = auth.uid()))
  WITH CHECK (property_id IN (SELECT users_profile.property_id FROM users_profile WHERE users_profile.auth_user_id = auth.uid()));

-- batch_lot_animals: por lote → propriedade
CREATE POLICY batch_lot_animals_select_same_property ON public.batch_lot_animals FOR SELECT TO authenticated
  USING (lot_id IN (SELECT bl.id FROM batch_lots bl JOIN users_profile u ON u.property_id = bl.property_id WHERE u.auth_user_id = auth.uid()));
CREATE POLICY batch_lot_animals_insert_same_property ON public.batch_lot_animals FOR INSERT TO authenticated
  WITH CHECK (lot_id IN (SELECT bl.id FROM batch_lots bl JOIN users_profile u ON u.property_id = bl.property_id WHERE u.auth_user_id = auth.uid()));
CREATE POLICY batch_lot_animals_update_same_property ON public.batch_lot_animals FOR UPDATE TO authenticated
  USING (lot_id IN (SELECT bl.id FROM batch_lots bl JOIN users_profile u ON u.property_id = bl.property_id WHERE u.auth_user_id = auth.uid()))
  WITH CHECK (lot_id IN (SELECT bl.id FROM batch_lots bl JOIN users_profile u ON u.property_id = bl.property_id WHERE u.auth_user_id = auth.uid()));

COMMIT;
