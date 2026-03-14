INSERT INTO emis.sources (id, code, name, kind, base_url, is_active)
VALUES
	('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'manual', 'Manual input', 'manual', NULL, true),
	('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'rss_demo', 'RSS Demo Feed', 'rss', 'https://example.com/rss', true),
	('cccccccc-cccc-cccc-cccc-cccccccccccc', 'telegram_demo', 'Telegram Demo', 'telegram', 'https://t.me/example', true)
ON CONFLICT (code) DO UPDATE
SET
	name = EXCLUDED.name,
	kind = EXCLUDED.kind,
	base_url = EXCLUDED.base_url,
	is_active = EXCLUDED.is_active,
	updated_at = now();
