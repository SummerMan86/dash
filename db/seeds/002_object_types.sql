INSERT INTO emis.object_types (id, code, name, geometry_kind, icon_key)
VALUES
	('11111111-1111-1111-1111-111111111111', 'port', 'Порт', 'point', 'anchor'),
	('22222222-2222-2222-2222-222222222222', 'refinery', 'НПЗ', 'point', 'factory'),
	('33333333-3333-3333-3333-333333333333', 'lng_terminal', 'LNG терминал', 'point', 'fuel')
ON CONFLICT (code) DO UPDATE
SET
	name = EXCLUDED.name,
	geometry_kind = EXCLUDED.geometry_kind,
	icon_key = EXCLUDED.icon_key;
