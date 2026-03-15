CREATE TABLE IF NOT EXISTS emis.audit_log (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	entity_type TEXT NOT NULL,
	entity_id UUID NOT NULL,
	action TEXT NOT NULL,
	actor_id TEXT NULL,
	occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'chk_emis_audit_log_entity_type'
			AND connamespace = 'emis'::regnamespace
	) THEN
		ALTER TABLE emis.audit_log
			ADD CONSTRAINT chk_emis_audit_log_entity_type
			CHECK (entity_type IN ('object', 'news_item', 'news_object_link'));
	END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_emis_audit_log_entity
	ON emis.audit_log (entity_type, entity_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_emis_audit_log_occurred_at
	ON emis.audit_log (occurred_at DESC);

CREATE OR REPLACE FUNCTION emis.prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'emis.audit_log is append-only';
END
$$;

DROP TRIGGER IF EXISTS trg_emis_audit_log_no_mutation ON emis.audit_log;

CREATE TRIGGER trg_emis_audit_log_no_mutation
	BEFORE UPDATE OR DELETE
	ON emis.audit_log
	FOR EACH ROW
	EXECUTE FUNCTION emis.prevent_audit_log_mutation();
