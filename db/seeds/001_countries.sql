INSERT INTO emis.countries (code, name_ru, name_en)
VALUES
	('RU', 'Россия', 'Russia'),
	('TR', 'Турция', 'Turkey'),
	('AE', 'ОАЭ', 'United Arab Emirates'),
	('KZ', 'Казахстан', 'Kazakhstan')
ON CONFLICT (code) DO UPDATE
SET
	name_ru = EXCLUDED.name_ru,
	name_en = EXCLUDED.name_en;
