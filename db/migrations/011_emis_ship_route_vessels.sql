CREATE SCHEMA IF NOT EXISTS mart;

DO $$
BEGIN
	IF to_regclass('mart_emis.vsl_route_point_hist') IS NOT NULL THEN
		EXECUTE $view$
			CREATE OR REPLACE VIEW mart.emis_ship_route_vessels AS
			WITH latest_points AS (
				SELECT DISTINCT ON (ship_hbk_id)
					ship_hbk_id,
					ship_id,
					imo,
					mmsi,
					vessel_name,
					vessel_type,
					flag,
					callsign,
					route_date_utc AS last_route_date_utc,
					fetched_at AS last_fetched_at,
					latitude AS last_latitude,
					longitude AS last_longitude
				FROM mart_emis.vsl_route_point_hist
				ORDER BY ship_hbk_id, fetched_at DESC, point_seq_ship DESC
			),
			route_rollup AS (
				SELECT
					ship_hbk_id,
					MIN(fetched_at) AS first_fetched_at,
					MAX(fetched_at) AS last_fetched_at,
					MAX(route_date_utc) AS last_route_date_utc,
					COUNT(*)::bigint AS points_count,
					COUNT(DISTINCT route_date_utc)::bigint AS route_days_count
				FROM mart_emis.vsl_route_point_hist
				GROUP BY ship_hbk_id
			)
			SELECT
				lp.ship_hbk_id,
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
			FROM latest_points lp
			JOIN route_rollup rr USING (ship_hbk_id)
		$view$;
	ELSE
		EXECUTE $view$
			CREATE OR REPLACE VIEW mart.emis_ship_route_vessels AS
			SELECT
				NULL::bigint AS ship_hbk_id,
				NULL::bigint AS ship_id,
				NULL::bigint AS imo,
				NULL::bigint AS mmsi,
				NULL::text AS vessel_name,
				NULL::text AS vessel_type,
				NULL::text AS flag,
				NULL::text AS callsign,
				NULL::timestamptz AS first_fetched_at,
				NULL::timestamptz AS last_fetched_at,
				NULL::date AS last_route_date_utc,
				NULL::bigint AS points_count,
				NULL::bigint AS route_days_count,
				NULL::numeric AS last_latitude,
				NULL::numeric AS last_longitude
			WHERE FALSE
		$view$;
	END IF;
END
$$;
