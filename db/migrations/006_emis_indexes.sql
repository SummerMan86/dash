CREATE INDEX IF NOT EXISTS idx_emis_news_items_published_at
	ON emis.news_items (published_at DESC);

CREATE INDEX IF NOT EXISTS idx_emis_news_items_source_published_at
	ON emis.news_items (source_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_emis_objects_object_type_id
	ON emis.objects (object_type_id);

CREATE INDEX IF NOT EXISTS idx_emis_objects_country_code
	ON emis.objects (country_code);

CREATE INDEX IF NOT EXISTS idx_emis_objects_geom_gist
	ON emis.objects
	USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_emis_news_items_geom_gist
	ON emis.news_items
	USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_emis_news_object_links_object_id
	ON emis.news_object_links (object_id);

CREATE INDEX IF NOT EXISTS idx_emis_news_object_links_news_id
	ON emis.news_object_links (news_id);

CREATE INDEX IF NOT EXISTS idx_emis_news_items_fts
	ON emis.news_items
	USING GIN (
		to_tsvector(
			'simple',
			coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(body, '')
		)
	);
