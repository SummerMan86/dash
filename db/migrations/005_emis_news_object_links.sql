CREATE TABLE IF NOT EXISTS emis.news_object_links (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	news_id UUID NOT NULL REFERENCES emis.news_items (id) ON DELETE CASCADE,
	object_id UUID NOT NULL REFERENCES emis.objects (id) ON DELETE CASCADE,
	link_type TEXT NOT NULL DEFAULT 'mentioned',
	is_primary BOOLEAN NOT NULL DEFAULT false,
	confidence NUMERIC(5,4) NULL,
	comment TEXT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	UNIQUE (news_id, object_id, link_type)
);
