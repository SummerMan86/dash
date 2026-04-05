-- Dashboard Builder DB snapshot
-- Source of truth for the active app schemas in this repo
-- Generated from live database dashboard via scripts/db-export-current-schema.sh
-- Scope: emis, stg_emis, mart_emis, mart
-- Excludes: emis.schema_migrations and archive-only legacy schemas

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

--
-- PostgreSQL database dump
--



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: emis; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA emis;


--
-- Name: mart; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA mart;


--
--



--
-- Name: mart_emis; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA mart_emis;


--
-- Name: stg_emis; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA stg_emis;


--
-- Name: prevent_audit_log_mutation(); Type: FUNCTION; Schema: emis; Owner: -
--

CREATE FUNCTION emis.prevent_audit_log_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
	RAISE EXCEPTION 'emis.audit_log is append-only';
END
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log; Type: TABLE; Schema: emis; Owner: -
--

CREATE TABLE emis.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    action text NOT NULL,
    actor_id text,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT chk_emis_audit_log_entity_type CHECK ((entity_type = ANY (ARRAY['object'::text, 'news_item'::text, 'news_object_link'::text])))
);


--
-- Name: countries; Type: TABLE; Schema: emis; Owner: -
--

CREATE TABLE emis.countries (
    code character(2) NOT NULL,
    name_ru text NOT NULL,
    name_en text NOT NULL
);


--
-- Name: news_items; Type: TABLE; Schema: emis; Owner: -
--

CREATE TABLE emis.news_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid NOT NULL,
    source_item_id text,
    url text,
    title text NOT NULL,
    summary text,
    body text,
    language character(2),
    published_at timestamp with time zone NOT NULL,
    collected_at timestamp with time zone DEFAULT now() NOT NULL,
    country_code character(2),
    region text,
    news_type text,
    importance smallint,
    geom public.geometry(Point,4326),
    is_manual boolean DEFAULT false NOT NULL,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    source_origin text DEFAULT 'manual'::text NOT NULL,
    created_by text,
    updated_by text,
    deleted_by text,
    CONSTRAINT chk_emis_news_items_source_origin CHECK ((source_origin = ANY (ARRAY['seed'::text, 'manual'::text, 'import'::text, 'ingestion'::text]))),
    CONSTRAINT news_items_importance_check CHECK (((importance >= 1) AND (importance <= 5)))
);


--
-- Name: news_object_links; Type: TABLE; Schema: emis; Owner: -
--

CREATE TABLE emis.news_object_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    news_id uuid NOT NULL,
    object_id uuid NOT NULL,
    link_type text DEFAULT 'mentioned'::text NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    confidence numeric(5,4),
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by text,
    updated_by text,
    deleted_by text
);


--
-- Name: object_types; Type: TABLE; Schema: emis; Owner: -
--

CREATE TABLE emis.object_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    geometry_kind text NOT NULL,
    icon_key text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT object_types_geometry_kind_check CHECK ((geometry_kind = ANY (ARRAY['point'::text, 'linestring'::text, 'polygon'::text, 'mixed'::text])))
);


--
-- Name: objects; Type: TABLE; Schema: emis; Owner: -
--

CREATE TABLE emis.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    external_id text,
    object_type_id uuid NOT NULL,
    name text NOT NULL,
    name_en text,
    country_code character(2),
    region text,
    status text DEFAULT 'active'::text NOT NULL,
    operator_name text,
    description text,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    geom public.geometry(Geometry,4326) NOT NULL,
    centroid public.geometry(Point,4326),
    source_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    source_origin text DEFAULT 'manual'::text NOT NULL,
    created_by text,
    updated_by text,
    deleted_by text,
    CONSTRAINT chk_emis_objects_source_origin CHECK ((source_origin = ANY (ARRAY['seed'::text, 'manual'::text, 'import'::text, 'ingestion'::text]))),
    CONSTRAINT chk_emis_objects_status CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'planned'::text, 'archived'::text])))
);


--
-- Name: sources; Type: TABLE; Schema: emis; Owner: -
--

CREATE TABLE emis.sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    kind text NOT NULL,
    base_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: emis; Owner: -
--

CREATE TABLE emis.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_emis_users_role CHECK ((role = ANY (ARRAY['viewer'::text, 'editor'::text, 'admin'::text])))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: emis; Owner: -
--

COMMENT ON TABLE emis.users IS 'EMIS user accounts for session-based auth';


--
-- Name: COLUMN users.password_hash; Type: COMMENT; Schema: emis; Owner: -
--

COMMENT ON COLUMN emis.users.password_hash IS 'bcrypt hash, cost factor 12+';


--
-- Name: COLUMN users.role; Type: COMMENT; Schema: emis; Owner: -
--

COMMENT ON COLUMN emis.users.role IS 'viewer | editor | admin';


--
-- Name: sessions; Type: TABLE; Schema: emis; Owner: -
--

CREATE TABLE emis.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: emis; Owner: -
--

COMMENT ON TABLE emis.sessions IS 'EMIS auth sessions, DB-backed for persistence across restarts';


--
-- Name: COLUMN sessions.role; Type: COMMENT; Schema: emis; Owner: -
--

COMMENT ON COLUMN emis.sessions.role IS 'Denormalized from users.role at session creation time';


--
-- Name: COLUMN sessions.expires_at; Type: COMMENT; Schema: emis; Owner: -
--

COMMENT ON COLUMN emis.sessions.expires_at IS 'Session expiry; default TTL 24h, configurable via EMIS_SESSION_TTL_HOURS';


--
-- Name: vw_news_flat; Type: VIEW; Schema: emis; Owner: -
--

CREATE VIEW emis.vw_news_flat AS
 SELECT n.id,
    s.code AS source_code,
    s.name AS source_name,
    n.published_at,
    n.country_code,
    n.news_type,
    n.importance,
    count(l.object_id) AS related_objects_count
   FROM ((emis.news_items n
     JOIN emis.sources s ON ((s.id = n.source_id)))
     LEFT JOIN emis.news_object_links l ON ((l.news_id = n.id)))
  WHERE (n.deleted_at IS NULL)
  GROUP BY n.id, s.code, s.name, n.published_at, n.country_code, n.news_type, n.importance;


--
-- Name: vw_object_news_facts; Type: VIEW; Schema: emis; Owner: -
--

CREATE VIEW emis.vw_object_news_facts AS
 SELECT l.id AS link_id,
    n.id AS news_id,
    o.id AS object_id,
    ot.code AS object_type_code,
    o.country_code AS object_country_code,
    n.published_at,
    s.code AS source_code,
    l.link_type,
    l.is_primary
   FROM ((((emis.news_object_links l
     JOIN emis.news_items n ON ((n.id = l.news_id)))
     JOIN emis.objects o ON ((o.id = l.object_id)))
     JOIN emis.object_types ot ON ((ot.id = o.object_type_id)))
     JOIN emis.sources s ON ((s.id = n.source_id)))
  WHERE ((n.deleted_at IS NULL) AND (o.deleted_at IS NULL));


--
-- Name: vw_objects_dim; Type: VIEW; Schema: emis; Owner: -
--

CREATE VIEW emis.vw_objects_dim AS
 SELECT o.id,
    o.name,
    ot.code AS object_type_code,
    ot.name AS object_type_name,
    o.country_code,
    o.region,
    o.status,
    o.operator_name,
    o.created_at,
    o.updated_at
   FROM (emis.objects o
     JOIN emis.object_types ot ON ((ot.id = o.object_type_id)))
  WHERE (o.deleted_at IS NULL);


--
-- Name: emis_news_flat; Type: VIEW; Schema: mart; Owner: -
--

CREATE VIEW mart.emis_news_flat AS
 SELECT n.id,
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
    count(l.object_id) AS related_objects_count
   FROM ((emis.news_items n
     JOIN emis.sources s ON ((s.id = n.source_id)))
     LEFT JOIN emis.news_object_links l ON ((l.news_id = n.id)))
  WHERE (n.deleted_at IS NULL)
  GROUP BY n.id, n.title, n.summary, s.code, s.name, n.published_at, n.country_code, n.region, n.news_type, n.importance, n.is_manual, n.source_origin, n.geom;


--
-- Name: emis_object_news_facts; Type: VIEW; Schema: mart; Owner: -
--

CREATE VIEW mart.emis_object_news_facts AS
 SELECT l.id AS link_id,
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
   FROM ((((emis.news_object_links l
     JOIN emis.news_items n ON ((n.id = l.news_id)))
     JOIN emis.objects o ON ((o.id = l.object_id)))
     JOIN emis.object_types ot ON ((ot.id = o.object_type_id)))
     JOIN emis.sources s ON ((s.id = n.source_id)))
  WHERE ((n.deleted_at IS NULL) AND (o.deleted_at IS NULL));


--
-- Name: emis_objects_dim; Type: VIEW; Schema: mart; Owner: -
--

CREATE VIEW mart.emis_objects_dim AS
 SELECT o.id,
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
    public.st_geometrytype(o.geom) AS geometry_type,
    public.st_x(o.centroid) AS centroid_lon,
    public.st_y(o.centroid) AS centroid_lat,
    o.created_at,
    o.updated_at
   FROM ((emis.objects o
     JOIN emis.object_types ot ON ((ot.id = o.object_type_id)))
     LEFT JOIN emis.countries c ON ((c.code = o.country_code)))
  WHERE (o.deleted_at IS NULL);


--
-- Name: vsl_position_raw; Type: TABLE; Schema: stg_emis; Owner: -
--

CREATE TABLE stg_emis.vsl_position_raw (
    position_raw_id bigint NOT NULL,
    load_batch_id bigint NOT NULL,
    source_row_num integer NOT NULL,
    imo bigint,
    mmsi bigint,
    ship_id bigint,
    vessel_name text,
    latitude numeric(9,6),
    longitude numeric(9,6),
    speed numeric(10,4),
    course numeric(10,4),
    heading numeric(10,4),
    vessel_type text,
    flag text,
    year_built integer,
    deadweight numeric(18,3),
    gross_tonnage numeric(18,3),
    length numeric(10,3),
    beam numeric(10,3),
    callsign text,
    lookup_source text,
    fetched_at timestamp with time zone,
    loaded_at timestamp with time zone DEFAULT now() NOT NULL,
    raw_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    load_error text,
    ship_hbk_id bigint,
    draught numeric(10,3),
    home_port text
);


--
-- Name: vsl_ships_hbk; Type: TABLE; Schema: stg_emis; Owner: -
--

CREATE TABLE stg_emis.vsl_ships_hbk (
    ship_hbk_id bigint NOT NULL,
    ship_id bigint,
    imo bigint,
    mmsi bigint,
    vessel_name text,
    vessel_type text,
    flag text,
    year_built integer,
    deadweight numeric(18,3),
    gross_tonnage numeric(18,3),
    length numeric(10,3),
    beam numeric(10,3),
    callsign text,
    first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_load_batch_id bigint,
    draught numeric(10,3),
    home_port text
);


--
-- Name: vsl_route_point_hist; Type: VIEW; Schema: mart_emis; Owner: -
--

CREATE VIEW mart_emis.vsl_route_point_hist AS
 WITH base AS (
         SELECT p.position_raw_id AS route_point_id,
            p.load_batch_id,
            p.ship_hbk_id,
            COALESCE(h.ship_id, p.ship_id) AS ship_id,
            COALESCE(h.imo, p.imo) AS imo,
            COALESCE(h.mmsi, p.mmsi) AS mmsi,
            COALESCE(h.vessel_name, p.vessel_name) AS vessel_name,
            COALESCE(h.vessel_type, p.vessel_type) AS vessel_type,
            COALESCE(h.flag, p.flag) AS flag,
            COALESCE(h.callsign, p.callsign) AS callsign,
            p.fetched_at,
            p.loaded_at,
            p.latitude,
            p.longitude,
            p.speed,
            p.course,
            p.heading,
            row_number() OVER (PARTITION BY p.ship_hbk_id, p.fetched_at, p.latitude, p.longitude ORDER BY p.position_raw_id DESC) AS point_dup_rn
           FROM (stg_emis.vsl_position_raw p
             LEFT JOIN stg_emis.vsl_ships_hbk h ON ((h.ship_hbk_id = p.ship_hbk_id)))
          WHERE ((p.load_error IS NULL) AND (p.ship_hbk_id IS NOT NULL) AND (p.fetched_at IS NOT NULL) AND (p.latitude IS NOT NULL) AND (p.longitude IS NOT NULL))
        ), dedup AS (
         SELECT base.route_point_id,
            base.load_batch_id,
            base.ship_hbk_id,
            base.ship_id,
            base.imo,
            base.mmsi,
            base.vessel_name,
            base.vessel_type,
            base.flag,
            base.callsign,
            base.fetched_at,
            base.loaded_at,
            base.latitude,
            base.longitude,
            base.speed,
            base.course,
            base.heading
           FROM base
          WHERE (base.point_dup_rn = 1)
        ), sequenced AS (
         SELECT d.route_point_id,
            d.load_batch_id,
            d.ship_hbk_id,
            d.ship_id,
            d.imo,
            d.mmsi,
            d.vessel_name,
            d.vessel_type,
            d.flag,
            d.callsign,
            d.fetched_at,
            d.loaded_at,
            d.latitude,
            d.longitude,
            d.speed,
            d.course,
            d.heading,
            ((d.fetched_at AT TIME ZONE 'UTC'::text))::date AS route_date_utc,
            row_number() OVER (PARTITION BY d.ship_hbk_id ORDER BY d.fetched_at, d.route_point_id) AS point_seq_ship,
            row_number() OVER (PARTITION BY d.ship_hbk_id, (((d.fetched_at AT TIME ZONE 'UTC'::text))::date) ORDER BY d.fetched_at, d.route_point_id) AS point_seq_day,
            lag(d.route_point_id) OVER (PARTITION BY d.ship_hbk_id ORDER BY d.fetched_at, d.route_point_id) AS prev_route_point_id,
            lag(d.fetched_at) OVER (PARTITION BY d.ship_hbk_id ORDER BY d.fetched_at, d.route_point_id) AS prev_fetched_at,
            lag(d.latitude) OVER (PARTITION BY d.ship_hbk_id ORDER BY d.fetched_at, d.route_point_id) AS prev_latitude,
            lag(d.longitude) OVER (PARTITION BY d.ship_hbk_id ORDER BY d.fetched_at, d.route_point_id) AS prev_longitude,
            lead(d.route_point_id) OVER (PARTITION BY d.ship_hbk_id ORDER BY d.fetched_at, d.route_point_id) AS next_route_point_id,
            lead(d.fetched_at) OVER (PARTITION BY d.ship_hbk_id ORDER BY d.fetched_at, d.route_point_id) AS next_fetched_at,
            lead(d.latitude) OVER (PARTITION BY d.ship_hbk_id ORDER BY d.fetched_at, d.route_point_id) AS next_latitude,
            lead(d.longitude) OVER (PARTITION BY d.ship_hbk_id ORDER BY d.fetched_at, d.route_point_id) AS next_longitude
           FROM dedup d
        )
 SELECT route_point_id,
    load_batch_id,
    ship_hbk_id,
    ship_id,
    imo,
    mmsi,
    vessel_name,
    vessel_type,
    flag,
    callsign,
    route_date_utc,
    point_seq_ship,
    point_seq_day,
    fetched_at,
    loaded_at,
    latitude,
    longitude,
    speed,
    course,
    heading,
    prev_route_point_id,
    prev_fetched_at,
    prev_latitude,
    prev_longitude,
    round((EXTRACT(epoch FROM (fetched_at - prev_fetched_at)) / 60.0), 3) AS gap_minutes_from_prev,
    ((prev_latitude IS NOT NULL) AND (prev_longitude IS NOT NULL) AND (latitude = prev_latitude) AND (longitude = prev_longitude)) AS same_coordinates_as_prev,
    next_route_point_id,
    next_fetched_at,
    next_latitude,
    next_longitude,
    round((EXTRACT(epoch FROM (next_fetched_at - fetched_at)) / 60.0), 3) AS gap_minutes_to_next
   FROM sequenced;


--
-- Name: emis_ship_route_vessels; Type: VIEW; Schema: mart; Owner: -
--

CREATE VIEW mart.emis_ship_route_vessels AS
 WITH latest_points AS (
         SELECT DISTINCT ON (vsl_route_point_hist.ship_hbk_id) vsl_route_point_hist.ship_hbk_id,
            vsl_route_point_hist.ship_id,
            vsl_route_point_hist.imo,
            vsl_route_point_hist.mmsi,
            vsl_route_point_hist.vessel_name,
            vsl_route_point_hist.vessel_type,
            vsl_route_point_hist.flag,
            vsl_route_point_hist.callsign,
            vsl_route_point_hist.route_date_utc AS last_route_date_utc,
            vsl_route_point_hist.fetched_at AS last_fetched_at,
            vsl_route_point_hist.latitude AS last_latitude,
            vsl_route_point_hist.longitude AS last_longitude
           FROM mart_emis.vsl_route_point_hist
          ORDER BY vsl_route_point_hist.ship_hbk_id, vsl_route_point_hist.fetched_at DESC, vsl_route_point_hist.point_seq_ship DESC
        ), route_rollup AS (
         SELECT vsl_route_point_hist.ship_hbk_id,
            min(vsl_route_point_hist.fetched_at) AS first_fetched_at,
            max(vsl_route_point_hist.fetched_at) AS last_fetched_at,
            max(vsl_route_point_hist.route_date_utc) AS last_route_date_utc,
            count(*) AS points_count,
            count(DISTINCT vsl_route_point_hist.route_date_utc) AS route_days_count
           FROM mart_emis.vsl_route_point_hist
          GROUP BY vsl_route_point_hist.ship_hbk_id
        )
 SELECT lp.ship_hbk_id,
    lp.ship_id,
    lp.imo,
    lp.mmsi,
    lp.vessel_name,
    lp.vessel_type,
    lp.flag,
    lp.callsign,
    rr.first_fetched_at,
    rr.last_fetched_at,
    rr.last_route_date_utc,
    rr.points_count,
    rr.route_days_count,
    lp.last_latitude,
    lp.last_longitude
   FROM (latest_points lp
     JOIN route_rollup rr USING (ship_hbk_id));


--
-- Name: vsl_route_segment_hist; Type: VIEW; Schema: mart_emis; Owner: -
--

CREATE VIEW mart_emis.vsl_route_segment_hist AS
 SELECT ship_hbk_id,
    ship_id,
    imo,
    mmsi,
    vessel_name,
    vessel_type,
    flag,
    callsign,
    point_seq_ship AS segment_seq_ship,
    route_date_utc,
    route_point_id AS from_route_point_id,
    next_route_point_id AS to_route_point_id,
    fetched_at AS from_fetched_at,
    next_fetched_at AS to_fetched_at,
    latitude AS from_latitude,
    longitude AS from_longitude,
    next_latitude AS to_latitude,
    next_longitude AS to_longitude,
    speed AS from_speed,
    course AS from_course,
    heading AS from_heading,
    gap_minutes_to_next AS gap_minutes,
    ((next_latitude IS NOT NULL) AND (next_longitude IS NOT NULL) AND (latitude = next_latitude) AND (longitude = next_longitude)) AS same_coordinates_as_next
   FROM mart_emis.vsl_route_point_hist p
  WHERE (next_route_point_id IS NOT NULL);


--
-- Name: vsl_load_batch; Type: TABLE; Schema: stg_emis; Owner: -
--

CREATE TABLE stg_emis.vsl_load_batch (
    load_batch_id bigint NOT NULL,
    source_system text DEFAULT 'marinetraffic'::text NOT NULL,
    source_file text,
    source_rows integer DEFAULT 0 NOT NULL,
    loaded_rows integer DEFAULT 0 NOT NULL,
    failed_rows integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'started'::text NOT NULL,
    load_notes text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    CONSTRAINT vsl_load_batch_status_check CHECK ((status = ANY (ARRAY['started'::text, 'loaded'::text, 'failed'::text])))
);


--
-- Name: vsl_load_batch_load_batch_id_seq; Type: SEQUENCE; Schema: stg_emis; Owner: -
--

CREATE SEQUENCE stg_emis.vsl_load_batch_load_batch_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vsl_load_batch_load_batch_id_seq; Type: SEQUENCE OWNED BY; Schema: stg_emis; Owner: -
--

ALTER SEQUENCE stg_emis.vsl_load_batch_load_batch_id_seq OWNED BY stg_emis.vsl_load_batch.load_batch_id;


--
-- Name: vsl_position_latest; Type: VIEW; Schema: stg_emis; Owner: -
--

CREATE VIEW stg_emis.vsl_position_latest AS
 WITH ranked AS (
         SELECT p.position_raw_id,
            p.load_batch_id,
            p.source_row_num,
            p.imo,
            p.mmsi,
            p.ship_id,
            p.vessel_name,
            p.latitude,
            p.longitude,
            p.speed,
            p.course,
            p.heading,
            p.vessel_type,
            p.flag,
            p.year_built,
            p.deadweight,
            p.gross_tonnage,
            p.length,
            p.beam,
            p.callsign,
            p.lookup_source,
            p.fetched_at,
            p.loaded_at,
            p.raw_payload,
            p.load_error,
            p.ship_hbk_id,
            p.draught,
            p.home_port,
            row_number() OVER (PARTITION BY COALESCE((p.ship_id)::text, (p.mmsi)::text, (p.imo)::text, p.vessel_name) ORDER BY p.fetched_at DESC NULLS LAST, p.loaded_at DESC, p.position_raw_id DESC) AS rn
           FROM stg_emis.vsl_position_raw p
          WHERE ((p.load_error IS NULL) AND (p.latitude IS NOT NULL) AND (p.longitude IS NOT NULL))
        )
 SELECT position_raw_id,
    load_batch_id,
    ship_hbk_id,
    source_row_num,
    imo,
    mmsi,
    ship_id,
    vessel_name,
    latitude,
    longitude,
    speed,
    course,
    heading,
    vessel_type,
    flag,
    year_built,
    deadweight,
    gross_tonnage,
    length,
    beam,
    callsign,
    lookup_source,
    fetched_at,
    loaded_at,
    raw_payload
   FROM ranked
  WHERE (rn = 1);


--
-- Name: vsl_position_raw_position_raw_id_seq; Type: SEQUENCE; Schema: stg_emis; Owner: -
--

CREATE SEQUENCE stg_emis.vsl_position_raw_position_raw_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vsl_position_raw_position_raw_id_seq; Type: SEQUENCE OWNED BY; Schema: stg_emis; Owner: -
--

ALTER SEQUENCE stg_emis.vsl_position_raw_position_raw_id_seq OWNED BY stg_emis.vsl_position_raw.position_raw_id;


--
-- Name: vsl_scraper_run_log; Type: TABLE; Schema: stg_emis; Owner: -
--

CREATE TABLE stg_emis.vsl_scraper_run_log (
    run_id bigint NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    duration_seconds numeric(10,3),
    vessels_requested integer DEFAULT 0 NOT NULL,
    vessels_success integer DEFAULT 0 NOT NULL,
    vessels_failed integer DEFAULT 0 NOT NULL,
    session_restarts integer DEFAULT 0 NOT NULL,
    load_batch_id bigint,
    config_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
    error_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'started'::text NOT NULL,
    CONSTRAINT vsl_scraper_run_log_status_check CHECK ((status = ANY (ARRAY['started'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: vsl_scraper_run_log_run_id_seq; Type: SEQUENCE; Schema: stg_emis; Owner: -
--

CREATE SEQUENCE stg_emis.vsl_scraper_run_log_run_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vsl_scraper_run_log_run_id_seq; Type: SEQUENCE OWNED BY; Schema: stg_emis; Owner: -
--

ALTER SEQUENCE stg_emis.vsl_scraper_run_log_run_id_seq OWNED BY stg_emis.vsl_scraper_run_log.run_id;


--
-- Name: vsl_ships_hbk_ship_hbk_id_seq; Type: SEQUENCE; Schema: stg_emis; Owner: -
--

CREATE SEQUENCE stg_emis.vsl_ships_hbk_ship_hbk_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vsl_ships_hbk_ship_hbk_id_seq; Type: SEQUENCE OWNED BY; Schema: stg_emis; Owner: -
--

ALTER SEQUENCE stg_emis.vsl_ships_hbk_ship_hbk_id_seq OWNED BY stg_emis.vsl_ships_hbk.ship_hbk_id;


--
-- Name: vsl_load_batch load_batch_id; Type: DEFAULT; Schema: stg_emis; Owner: -
--

ALTER TABLE ONLY stg_emis.vsl_load_batch ALTER COLUMN load_batch_id SET DEFAULT nextval('stg_emis.vsl_load_batch_load_batch_id_seq'::regclass);


--
-- Name: vsl_position_raw position_raw_id; Type: DEFAULT; Schema: stg_emis; Owner: -
--

ALTER TABLE ONLY stg_emis.vsl_position_raw ALTER COLUMN position_raw_id SET DEFAULT nextval('stg_emis.vsl_position_raw_position_raw_id_seq'::regclass);


--
-- Name: vsl_scraper_run_log run_id; Type: DEFAULT; Schema: stg_emis; Owner: -
--

ALTER TABLE ONLY stg_emis.vsl_scraper_run_log ALTER COLUMN run_id SET DEFAULT nextval('stg_emis.vsl_scraper_run_log_run_id_seq'::regclass);


--
-- Name: vsl_ships_hbk ship_hbk_id; Type: DEFAULT; Schema: stg_emis; Owner: -
--

ALTER TABLE ONLY stg_emis.vsl_ships_hbk ALTER COLUMN ship_hbk_id SET DEFAULT nextval('stg_emis.vsl_ships_hbk_ship_hbk_id_seq'::regclass);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: emis; Owner: -
--

ALTER TABLE ONLY emis.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: emis; Owner: -
--

ALTER TABLE ONLY emis.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (code);


--
-- Name: news_items news_items_pkey; Type: CONSTRAINT; Schema: emis; Owner: -
--

ALTER TABLE ONLY emis.news_items
    ADD CONSTRAINT news_items_pkey PRIMARY KEY (id);


--
-- Name: news_object_links news_object_links_news_id_object_id_link_type_key; Type: CONSTRAINT; Schema: emis; Owner: -
--

ALTER TABLE ONLY emis.news_object_links
    ADD CONSTRAINT news_object_links_news_id_object_id_link_type_key UNIQUE (news_id, object_id, link_type);


--
-- Name: news_object_links news_object_links_pkey; Type: CONSTRAINT; Schema: emis; Owner: -
--

ALTER TABLE ONLY emis.news_object_links
    ADD CONSTRAINT news_object_links_pkey PRIMARY KEY (id);


--
-- Name: object_types object_types_code_key; Type: CONSTRAINT; Schema: emis; Owner: -
--

ALTER TABLE ONLY emis.object_types
    ADD CONSTRAINT object_types_code_key UNIQUE (code);


--
-- Name: object_types object_types_pkey; Type: CONSTRAINT; Schema: emis; Owner: -
--

ALTER TABLE ONLY emis.object_types
    ADD CONSTRAINT object_types_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: emis; Owner: -
--

ALTER TABLE ONLY emis.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: sources sources_code_key; Type: CONSTRAINT; Schema: emis; Owner: -
--

ALTER TABLE ONLY emis.sources
    ADD CONSTRAINT sources_code_key UNIQUE (code);


--
-- Name: sources sources_pkey; Type: CONSTRAINT; Schema: emis; Owner: -
--

ALTER TABLE ONLY emis.sources
    ADD CONSTRAINT sources_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: emis; Owner: -
--

ALTER TABLE ONLY emis.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users uq_users_username; Type: CONSTRAINT; Schema: emis; Owner: -
--

ALTER TABLE ONLY emis.users
    ADD CONSTRAINT uq_users_username UNIQUE (username);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: emis; Owner: -
--

ALTER TABLE ONLY emis.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: vsl_load_batch vsl_load_batch_pkey; Type: CONSTRAINT; Schema: stg_emis; Owner: -
--

ALTER TABLE ONLY stg_emis.vsl_load_batch
    ADD CONSTRAINT vsl_load_batch_pkey PRIMARY KEY (load_batch_id);


--
-- Name: vsl_position_raw vsl_position_raw_pkey; Type: CONSTRAINT; Schema: stg_emis; Owner: -
--

ALTER TABLE ONLY stg_emis.vsl_position_raw
    ADD CONSTRAINT vsl_position_raw_pkey PRIMARY KEY (position_raw_id);


--
-- Name: vsl_scraper_run_log vsl_scraper_run_log_pkey; Type: CONSTRAINT; Schema: stg_emis; Owner: -
--

ALTER TABLE ONLY stg_emis.vsl_scraper_run_log
    ADD CONSTRAINT vsl_scraper_run_log_pkey PRIMARY KEY (run_id);


--
-- Name: vsl_ships_hbk vsl_ships_hbk_imo_key; Type: CONSTRAINT; Schema: stg_emis; Owner: -
--

ALTER TABLE ONLY stg_emis.vsl_ships_hbk
    ADD CONSTRAINT vsl_ships_hbk_imo_key UNIQUE (imo);


--
-- Name: vsl_ships_hbk vsl_ships_hbk_mmsi_key; Type: CONSTRAINT; Schema: stg_emis; Owner: -
--

ALTER TABLE ONLY stg_emis.vsl_ships_hbk
    ADD CONSTRAINT vsl_ships_hbk_mmsi_key UNIQUE (mmsi);


--
-- Name: vsl_ships_hbk vsl_ships_hbk_pkey; Type: CONSTRAINT; Schema: stg_emis; Owner: -
--

ALTER TABLE ONLY stg_emis.vsl_ships_hbk
    ADD CONSTRAINT vsl_ships_hbk_pkey PRIMARY KEY (ship_hbk_id);


--
-- Name: vsl_ships_hbk vsl_ships_hbk_ship_id_key; Type: CONSTRAINT; Schema: stg_emis; Owner: -
--

ALTER TABLE ONLY stg_emis.vsl_ships_hbk
    ADD CONSTRAINT vsl_ships_hbk_ship_id_key UNIQUE (ship_id);


--
-- Name: idx_emis_audit_log_entity; Type: INDEX; Schema: emis; Owner: -
--

CREATE INDEX idx_emis_audit_log_entity ON emis.audit_log USING btree (entity_type, entity_id, occurred_at DESC);


--
-- Name: idx_emis_audit_log_occurred_at; Type: INDEX; Schema: emis; Owner: -
--

CREATE INDEX idx_emis_audit_log_occurred_at ON emis.audit_log USING btree (occurred_at DESC);


--
-- Name: idx_emis_news_items_fts; Type: INDEX; Schema: emis; Owner: -
--

CREATE INDEX idx_emis_news_items_fts ON emis.news_items USING gin (to_tsvector('simple'::regconfig, ((((COALESCE(title, ''::text) || ' '::text) || COALESCE(summary, ''::text)) || ' '::text) || COALESCE(body, ''::text))));


--
-- Name: idx_emis_news_items_geom_gist; Type: INDEX; Schema: emis; Owner: -
--

CREATE INDEX idx_emis_news_items_geom_gist ON emis.news_items USING gist (geom);


--
-- Name: idx_emis_news_items_published_at; Type: INDEX; Schema: emis; Owner: -
--

CREATE INDEX idx_emis_news_items_published_at ON emis.news_items USING btree (published_at DESC);


--
-- Name: idx_emis_news_items_source_published_at; Type: INDEX; Schema: emis; Owner: -
--

CREATE INDEX idx_emis_news_items_source_published_at ON emis.news_items USING btree (source_id, published_at DESC);


--
-- Name: idx_emis_news_object_links_news_id; Type: INDEX; Schema: emis; Owner: -
--

CREATE INDEX idx_emis_news_object_links_news_id ON emis.news_object_links USING btree (news_id);


--
-- Name: idx_emis_news_object_links_object_id; Type: INDEX; Schema: emis; Owner: -
--

CREATE INDEX idx_emis_news_object_links_object_id ON emis.news_object_links USING btree (object_id);


--
-- Name: idx_emis_objects_country_code; Type: INDEX; Schema: emis; Owner: -
--

CREATE INDEX idx_emis_objects_country_code ON emis.objects USING btree (country_code);


--
-- Name: idx_emis_objects_geom_gist; Type: INDEX; Schema: emis; Owner: -
--

CREATE INDEX idx_emis_objects_geom_gist ON emis.objects USING gist (geom);


--
-- Name: idx_emis_objects_object_type_id; Type: INDEX; Schema: emis; Owner: -
--

CREATE INDEX idx_emis_objects_object_type_id ON emis.objects USING btree (object_type_id);


--
-- Name: ux_emis_news_items_source_item_active; Type: INDEX; Schema: emis; Owner: -
--

CREATE UNIQUE INDEX ux_emis_news_items_source_item_active ON emis.news_items USING btree (source_id, source_item_id) WHERE ((source_item_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: ux_emis_news_items_source_url_active; Type: INDEX; Schema: emis; Owner: -
--

CREATE UNIQUE INDEX ux_emis_news_items_source_url_active ON emis.news_items USING btree (source_id, url) WHERE ((source_item_id IS NULL) AND (url IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: ux_emis_objects_external_id_active; Type: INDEX; Schema: emis; Owner: -
--

CREATE UNIQUE INDEX ux_emis_objects_external_id_active ON emis.objects USING btree (external_id) WHERE ((external_id IS NOT NULL) AND (deleted_at IS NULL));


--
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: emis; Owner: -
--

CREATE INDEX idx_sessions_expires_at ON emis.sessions USING btree (expires_at);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: emis; Owner: -
--

CREATE INDEX idx_sessions_user_id ON emis.sessions USING btree (user_id);


--
-- Name: vsl_position_raw_ix_fetched_at; Type: INDEX; Schema: stg_emis; Owner: -
--

CREATE INDEX vsl_position_raw_ix_fetched_at ON stg_emis.vsl_position_raw USING btree (fetched_at DESC);


--
-- Name: vsl_position_raw_ix_imo; Type: INDEX; Schema: stg_emis; Owner: -
--

CREATE INDEX vsl_position_raw_ix_imo ON stg_emis.vsl_position_raw USING btree (imo);


--
-- Name: vsl_position_raw_ix_mmsi; Type: INDEX; Schema: stg_emis; Owner: -
--

CREATE INDEX vsl_position_raw_ix_mmsi ON stg_emis.vsl_position_raw USING btree (mmsi);


--
-- Name: vsl_position_raw_ix_ship_hbk_fetched_at; Type: INDEX; Schema: stg_emis; Owner: -
--

CREATE INDEX vsl_position_raw_ix_ship_hbk_fetched_at ON stg_emis.vsl_position_raw USING btree (ship_hbk_id, fetched_at DESC, position_raw_id DESC);


--
-- Name: vsl_position_raw_ix_ship_hbk_id; Type: INDEX; Schema: stg_emis; Owner: -
--

CREATE INDEX vsl_position_raw_ix_ship_hbk_id ON stg_emis.vsl_position_raw USING btree (ship_hbk_id);


--
-- Name: vsl_position_raw_ix_ship_id; Type: INDEX; Schema: stg_emis; Owner: -
--

CREATE INDEX vsl_position_raw_ix_ship_id ON stg_emis.vsl_position_raw USING btree (ship_id);


--
-- Name: vsl_position_raw_uq_batch_row; Type: INDEX; Schema: stg_emis; Owner: -
--

CREATE UNIQUE INDEX vsl_position_raw_uq_batch_row ON stg_emis.vsl_position_raw USING btree (load_batch_id, source_row_num);


--
-- Name: vsl_scraper_run_log_ix_started_at; Type: INDEX; Schema: stg_emis; Owner: -
--

CREATE INDEX vsl_scraper_run_log_ix_started_at ON stg_emis.vsl_scraper_run_log USING btree (started_at DESC);


--
-- Name: vsl_ships_hbk_ix_last_seen_at; Type: INDEX; Schema: stg_emis; Owner: -
--

CREATE INDEX vsl_ships_hbk_ix_last_seen_at ON stg_emis.vsl_ships_hbk USING btree (last_seen_at DESC);


--
-- Name: vsl_ships_hbk_ix_vessel_name; Type: INDEX; Schema: stg_emis; Owner: -
--

CREATE INDEX vsl_ships_hbk_ix_vessel_name ON stg_emis.vsl_ships_hbk USING btree (vessel_name);


--
-- Name: audit_log trg_emis_audit_log_no_mutation; Type: TRIGGER; Schema: emis; Owner: -
--

CREATE TRIGGER trg_emis_audit_log_no_mutation BEFORE DELETE OR UPDATE ON emis.audit_log FOR EACH ROW EXECUTE FUNCTION emis.prevent_audit_log_mutation();


--
-- Name: news_items news_items_country_code_fkey; Type: FK CONSTRAINT; Schema: emis; Owner: -
--

ALTER TABLE ONLY emis.news_items
    ADD CONSTRAINT news_items_country_code_fkey FOREIGN KEY (country_code) REFERENCES emis.countries(code);


--
-- Name: news_items news_items_source_id_fkey; Type: FK CONSTRAINT; Schema: emis; Owner: -
--

ALTER TABLE ONLY emis.news_items
    ADD CONSTRAINT news_items_source_id_fkey FOREIGN KEY (source_id) REFERENCES emis.sources(id);


--
-- Name: news_object_links news_object_links_news_id_fkey; Type: FK CONSTRAINT; Schema: emis; Owner: -
--

ALTER TABLE ONLY emis.news_object_links
    ADD CONSTRAINT news_object_links_news_id_fkey FOREIGN KEY (news_id) REFERENCES emis.news_items(id) ON DELETE CASCADE;


--
-- Name: news_object_links news_object_links_object_id_fkey; Type: FK CONSTRAINT; Schema: emis; Owner: -
--

ALTER TABLE ONLY emis.news_object_links
    ADD CONSTRAINT news_object_links_object_id_fkey FOREIGN KEY (object_id) REFERENCES emis.objects(id) ON DELETE CASCADE;


--
-- Name: objects objects_country_code_fkey; Type: FK CONSTRAINT; Schema: emis; Owner: -
--

ALTER TABLE ONLY emis.objects
    ADD CONSTRAINT objects_country_code_fkey FOREIGN KEY (country_code) REFERENCES emis.countries(code);


--
-- Name: objects objects_object_type_id_fkey; Type: FK CONSTRAINT; Schema: emis; Owner: -
--

ALTER TABLE ONLY emis.objects
    ADD CONSTRAINT objects_object_type_id_fkey FOREIGN KEY (object_type_id) REFERENCES emis.object_types(id);


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: emis; Owner: -
--

ALTER TABLE ONLY emis.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES emis.users(id) ON DELETE CASCADE;


--
-- Name: vsl_position_raw vsl_position_raw_load_batch_id_fkey; Type: FK CONSTRAINT; Schema: stg_emis; Owner: -
--

ALTER TABLE ONLY stg_emis.vsl_position_raw
    ADD CONSTRAINT vsl_position_raw_load_batch_id_fkey FOREIGN KEY (load_batch_id) REFERENCES stg_emis.vsl_load_batch(load_batch_id);


--
-- Name: vsl_position_raw vsl_position_raw_ship_hbk_fk; Type: FK CONSTRAINT; Schema: stg_emis; Owner: -
--

ALTER TABLE ONLY stg_emis.vsl_position_raw
    ADD CONSTRAINT vsl_position_raw_ship_hbk_fk FOREIGN KEY (ship_hbk_id) REFERENCES stg_emis.vsl_ships_hbk(ship_hbk_id);


--
-- Name: vsl_scraper_run_log vsl_scraper_run_log_load_batch_id_fkey; Type: FK CONSTRAINT; Schema: stg_emis; Owner: -
--

ALTER TABLE ONLY stg_emis.vsl_scraper_run_log
    ADD CONSTRAINT vsl_scraper_run_log_load_batch_id_fkey FOREIGN KEY (load_batch_id) REFERENCES stg_emis.vsl_load_batch(load_batch_id);


--
-- Name: vsl_ships_hbk vsl_ships_hbk_last_load_batch_id_fkey; Type: FK CONSTRAINT; Schema: stg_emis; Owner: -
--

ALTER TABLE ONLY stg_emis.vsl_ships_hbk
    ADD CONSTRAINT vsl_ships_hbk_last_load_batch_id_fkey FOREIGN KEY (last_load_batch_id) REFERENCES stg_emis.vsl_load_batch(load_batch_id);


--
-- PostgreSQL database dump complete
--


