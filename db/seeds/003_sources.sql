INSERT INTO emis.sources (id, code, name, kind, base_url, is_active)
VALUES
	('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'manual', 'Manual input', 'manual', NULL, true),
	('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'rss_demo', 'RSS Demo Feed', 'rss', 'https://example.com/rss', true),
	('cccccccc-cccc-cccc-cccc-cccccccccccc', 'telegram_demo', 'Telegram Demo', 'telegram', 'https://t.me/example', true),
	('dddddddd-dddd-dddd-dddd-dddddddddddd', 'osm', 'OpenStreetMap Overpass', 'external', 'https://overpass-api.de/api', true),
	('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'gem', 'Global Energy Monitor', 'external', 'https://globalenergymonitor.org', true)
ON CONFLICT (code) DO UPDATE
SET
	name = EXCLUDED.name,
	kind = EXCLUDED.kind,
	base_url = EXCLUDED.base_url,
	is_active = EXCLUDED.is_active,
	updated_at = now();
