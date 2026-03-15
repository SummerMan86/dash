ALTER TABLE emis.objects
	ADD COLUMN IF NOT EXISTS source_origin TEXT,
	ADD COLUMN IF NOT EXISTS created_by TEXT NULL,
	ADD COLUMN IF NOT EXISTS updated_by TEXT NULL,
	ADD COLUMN IF NOT EXISTS deleted_by TEXT NULL;

ALTER TABLE emis.news_items
	ADD COLUMN IF NOT EXISTS source_origin TEXT,
	ADD COLUMN IF NOT EXISTS created_by TEXT NULL,
	ADD COLUMN IF NOT EXISTS updated_by TEXT NULL,
	ADD COLUMN IF NOT EXISTS deleted_by TEXT NULL;

ALTER TABLE emis.news_object_links
	ADD COLUMN IF NOT EXISTS created_by TEXT NULL,
	ADD COLUMN IF NOT EXISTS updated_by TEXT NULL,
	ADD COLUMN IF NOT EXISTS deleted_by TEXT NULL;

UPDATE emis.objects
SET source_origin = CASE
	WHEN source_note = 'seed' THEN 'seed'
	ELSE 'manual'
END
WHERE source_origin IS NULL;

UPDATE emis.news_items
SET source_origin = CASE
	WHEN coalesce(meta ->> 'seed', 'false') = 'true' THEN 'seed'
	WHEN is_manual THEN 'manual'
	ELSE 'import'
END
WHERE source_origin IS NULL;

ALTER TABLE emis.objects
	ALTER COLUMN source_origin SET DEFAULT 'manual',
	ALTER COLUMN source_origin SET NOT NULL;

ALTER TABLE emis.news_items
	ALTER COLUMN source_origin SET DEFAULT 'manual',
	ALTER COLUMN source_origin SET NOT NULL;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'chk_emis_objects_status'
			AND connamespace = 'emis'::regnamespace
	) THEN
		ALTER TABLE emis.objects
			ADD CONSTRAINT chk_emis_objects_status
			CHECK (status IN ('active', 'inactive', 'planned', 'archived'));
	END IF;
END
$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'chk_emis_objects_source_origin'
			AND connamespace = 'emis'::regnamespace
	) THEN
		ALTER TABLE emis.objects
			ADD CONSTRAINT chk_emis_objects_source_origin
			CHECK (source_origin IN ('seed', 'manual', 'import', 'ingestion'));
	END IF;
END
$$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'chk_emis_news_items_source_origin'
			AND connamespace = 'emis'::regnamespace
	) THEN
		ALTER TABLE emis.news_items
			ADD CONSTRAINT chk_emis_news_items_source_origin
			CHECK (source_origin IN ('seed', 'manual', 'import', 'ingestion'));
	END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_emis_objects_external_id_active
	ON emis.objects (external_id)
	WHERE external_id IS NOT NULL
		AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_emis_news_items_source_item_active
	ON emis.news_items (source_id, source_item_id)
	WHERE source_item_id IS NOT NULL
		AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_emis_news_items_source_url_active
	ON emis.news_items (source_id, url)
	WHERE source_item_id IS NULL
		AND url IS NOT NULL
		AND deleted_at IS NULL;
