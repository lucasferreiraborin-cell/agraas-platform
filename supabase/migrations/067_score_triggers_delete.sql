-- Migration 067: Add ON DELETE triggers for bovine score recalculation
-- Existing triggers only fire on INSERT OR UPDATE. When a weight, application
-- or event is deleted the score must be recalculated using OLD.animal_id.

-- ── 1. New trigger functions that handle DELETE (OLD) ────────────────────────

CREATE OR REPLACE FUNCTION _trg_score_from_weight_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM calculate_agraas_score(OLD.animal_id);
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION _trg_score_from_event_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.animal_id IS NOT NULL THEN
    PERFORM calculate_agraas_score(OLD.animal_id);
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION _trg_score_from_application_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM calculate_agraas_score(OLD.animal_id);
  RETURN OLD;
END;
$$;

-- ── 2. Create DELETE triggers ────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_score_on_weight_delete      ON weights;
DROP TRIGGER IF EXISTS trg_score_on_event_delete       ON events;
DROP TRIGGER IF EXISTS trg_score_on_application_delete ON applications;

CREATE TRIGGER trg_score_on_weight_delete
  AFTER DELETE ON weights
  FOR EACH ROW EXECUTE FUNCTION _trg_score_from_weight_delete();

CREATE TRIGGER trg_score_on_event_delete
  AFTER DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION _trg_score_from_event_delete();

CREATE TRIGGER trg_score_on_application_delete
  AFTER DELETE ON applications
  FOR EACH ROW EXECUTE FUNCTION _trg_score_from_application_delete();
