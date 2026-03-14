CREATE OR REPLACE VIEW emis.vw_news_flat AS
SELECT
	n.id,
	s.code AS source_code,
	s.name AS source_name,
	n.published_at,
	n.country_code,
	n.news_type,
	n.importance,
	COUNT(l.object_id) AS related_objects_count
FROM emis.news_items n
JOIN emis.sources s
	ON s.id = n.source_id
LEFT JOIN emis.news_object_links l
	ON l.news_id = n.id
WHERE n.deleted_at IS NULL
GROUP BY
	n.id,
	s.code,
	s.name,
	n.published_at,
	n.country_code,
	n.news_type,
	n.importance;

CREATE OR REPLACE VIEW emis.vw_object_news_facts AS
SELECT
	l.id AS link_id,
	n.id AS news_id,
	o.id AS object_id,
	ot.code AS object_type_code,
	o.country_code AS object_country_code,
	n.published_at,
	s.code AS source_code,
	l.link_type,
	l.is_primary
FROM emis.news_object_links l
JOIN emis.news_items n
	ON n.id = l.news_id
JOIN emis.objects o
	ON o.id = l.object_id
JOIN emis.object_types ot
	ON ot.id = o.object_type_id
JOIN emis.sources s
	ON s.id = n.source_id
WHERE n.deleted_at IS NULL
	AND o.deleted_at IS NULL;

CREATE OR REPLACE VIEW emis.vw_objects_dim AS
SELECT
	o.id,
	o.name,
	ot.code AS object_type_code,
	ot.name AS object_type_name,
	o.country_code,
	o.region,
	o.status,
	o.operator_name,
	o.created_at,
	o.updated_at
FROM emis.objects o
JOIN emis.object_types ot
	ON ot.id = o.object_type_id
WHERE o.deleted_at IS NULL;
