-- Rollback migration 067
DROP TRIGGER IF EXISTS trg_score_on_weight_delete      ON weights;
DROP TRIGGER IF EXISTS trg_score_on_event_delete       ON events;
DROP TRIGGER IF EXISTS trg_score_on_application_delete ON applications;
DROP FUNCTION IF EXISTS _trg_score_from_weight_delete();
DROP FUNCTION IF EXISTS _trg_score_from_event_delete();
DROP FUNCTION IF EXISTS _trg_score_from_application_delete();
