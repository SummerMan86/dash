INSERT INTO emis.object_types (id, code, name, geometry_kind, icon_key)
VALUES
	('11111111-1111-1111-1111-111111111111', 'port', 'Порт', 'point', 'anchor'),
	('22222222-2222-2222-2222-222222222222', 'refinery', 'НПЗ', 'point', 'factory'),
	('33333333-3333-3333-3333-333333333333', 'lng_terminal', 'LNG терминал', 'point', 'fuel'),
	('44444444-4444-4444-4444-444444444444', 'power_plant', 'Электростанция', 'mixed', 'zap'),
	('55555555-5555-5555-5555-555555555555', 'coal_mine', 'Угольная шахта', 'mixed', 'pickaxe'),
	('66666666-6666-6666-6666-666666666666', 'gas_pipeline', 'Газопровод', 'linestring', 'pipeline'),
	('77777777-7777-7777-7777-777777777777', 'oil_pipeline', 'Нефтепровод', 'linestring', 'pipeline'),
	('88888888-8888-8888-8888-888888888888', 'terminal', 'Терминал', 'mixed', 'warehouse'),
	('99999999-9999-9999-9999-999999999999', 'storage', 'Хранилище', 'mixed', 'database'),
	('aabbccdd-aabb-ccdd-aabb-ccddaabbccdd', 'substation', 'Подстанция', 'mixed', 'bolt')
ON CONFLICT (code) DO UPDATE
SET
	name = EXCLUDED.name,
	geometry_kind = EXCLUDED.geometry_kind,
	icon_key = EXCLUDED.icon_key;
