CREATE TABLE IF NOT EXISTS emis.countries (
	code CHAR(2) PRIMARY KEY,
	name_ru TEXT NOT NULL,
	name_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS emis.object_types (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	code TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	geometry_kind TEXT NOT NULL CHECK (geometry_kind IN ('point', 'linestring', 'polygon', 'mixed')),
	icon_key TEXT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emis.sources (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	code TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	kind TEXT NOT NULL,
	base_url TEXT NULL,
	is_active BOOLEAN NOT NULL DEFAULT true,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
