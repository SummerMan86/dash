CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS emis;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_available_extensions
		WHERE name = 'postgis'
	) THEN
		RAISE EXCEPTION 'PostGIS extension is not available in this PostgreSQL instance. Use PostgreSQL with PostGIS installed before running EMIS migrations.';
	END IF;
END
$$;

CREATE EXTENSION IF NOT EXISTS postgis;
