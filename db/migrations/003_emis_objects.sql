CREATE TABLE IF NOT EXISTS emis.objects (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	external_id TEXT NULL,
	object_type_id UUID NOT NULL REFERENCES emis.object_types (id),
	name TEXT NOT NULL,
	name_en TEXT NULL,
	country_code CHAR(2) NULL REFERENCES emis.countries (code),
	region TEXT NULL,
	status TEXT NOT NULL DEFAULT 'active',
	operator_name TEXT NULL,
	description TEXT NULL,
	attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
	geom geometry(Geometry, 4326) NOT NULL,
	centroid geometry(Point, 4326) NULL,
	source_note TEXT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	deleted_at TIMESTAMPTZ NULL
);
