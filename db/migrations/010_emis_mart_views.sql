CREATE SCHEMA IF NOT EXISTS mart;

CREATE OR REPLACE VIEW mart.emis_news_flat AS
SELECT
	n.id,
	n.title,
	n.summary,
	s.code AS source_code,
	s.name AS source_name,
	n.published_at,
	n.country_code,
	n.region,
	n.news_type,
	n.importance,
	n.is_manual,
	n.source_origin,
	(n.geom IS NOT NULL) AS has_geometry,
	COUNT(l.object_id) AS related_objects_count
FROM emis.news_items n
JOIN emis.sources s
	ON s.id = n.source_id
LEFT JOIN emis.news_object_links l
	ON l.news_id = n.id
WHERE n.deleted_at IS NULL
GROUP BY
	n.id,
	n.title,
	n.summary,
	s.code,
	s.name,
	n.published_at,
	n.country_code,
	n.region,
	n.news_type,
	n.importance,
	n.is_manual,
	n.source_origin,
	n.geom;

CREATE OR REPLACE VIEW mart.emis_object_news_facts AS
SELECT
	l.id AS link_id,
	n.id AS news_id,
	n.title AS news_title,
	o.id AS object_id,
	o.name AS object_name,
	ot.code AS object_type_code,
	ot.name AS object_type_name,
	o.country_code AS object_country_code,
	n.published_at,
	s.code AS source_code,
	s.name AS source_name,
	l.link_type,
	l.is_primary,
	l.confidence,
	n.source_origin AS news_source_origin,
	o.source_origin AS object_source_origin
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

CREATE OR REPLACE VIEW mart.emis_objects_dim AS
SELECT
	o.id,
	o.external_id,
	o.name,
	o.name_en,
	ot.code AS object_type_code,
	ot.name AS object_type_name,
	o.country_code,
	c.name_ru AS country_name_ru,
	c.name_en AS country_name_en,
	o.region,
	o.status,
	o.operator_name,
	o.source_origin,
	ST_GeometryType(o.geom) AS geometry_type,
	ST_X(o.centroid) AS centroid_lon,
	ST_Y(o.centroid) AS centroid_lat,
	o.created_at,
	o.updated_at
FROM emis.objects o
JOIN emis.object_types ot
	ON ot.id = o.object_type_id
LEFT JOIN emis.countries c
	ON c.code = o.country_code
WHERE o.deleted_at IS NULL;
