-- Live delta for published Strategy dashboard wrappers.
--
-- Rationale:
-- - the app dataset layer now reads `mart_strategy.slobi_*`
-- - the local live DB already contains the underlying `mart_strategy` base mart/views
-- - these published wrappers were not yet created in the local `dashboard` database
--
-- Full Strategy/BSC DWH source of truth still lives in the external `agent_pack`.
-- This delta only publishes the app-facing wrappers required by dashboard-builder.

CREATE OR REPLACE VIEW mart_strategy.slobi_entity_overview AS
WITH binding_agg AS (
	SELECT
		b.strategy_entity_id,
		COUNT(DISTINCT b.binding_target_id) FILTER (WHERE b.binding_target_type = 'Документ')::integer
			AS document_count,
		COUNT(DISTINCT b.binding_target_id) FILTER (WHERE b.binding_target_type = 'Цель')::integer
			AS goal_count,
		COUNT(DISTINCT b.binding_target_id) FILTER (WHERE b.binding_target_type = 'Задача')::integer
			AS task_count,
		COUNT(DISTINCT b.binding_target_id) FILTER (WHERE b.binding_target_type = 'KPI')::integer
			AS kpi_count,
		COUNT(DISTINCT b.binding_target_id) FILTER (
			WHERE b.binding_target_type = 'Кандидатная метрика'
		)::integer AS candidate_metric_count,
		BOOL_OR(b.confirmed_flag) AS has_confirmed_evidence_flag,
		COUNT(*) FILTER (WHERE b.confirmed_flag) = 0 AND COUNT(*) > 0 AS has_derived_only_flag
	FROM mart_strategy.strategy_entity_binding_bridge b
	GROUP BY b.strategy_entity_id
),
gap_agg AS (
	SELECT
		g.primary_entity_id AS strategy_entity_id,
		COUNT(DISTINCT g.gap_id)::integer AS gap_count
	FROM mart_strategy.bsc_gap_fact g
	WHERE g.primary_entity_id IS NOT NULL
	GROUP BY g.primary_entity_id
),
entity_links AS (
	SELECT
		pfb.performance_entity_key,
		MIN(fe.strategy_entity_id) AS linked_strategy_entity_id
	FROM mart_strategy.bsc_performance_fact_bridge pfb
	LEFT JOIN mart_strategy.strategy_fact_entity_bridge fe
		ON fe.fact_id = pfb.fact_id
	GROUP BY pfb.performance_entity_key
),
perf_agg AS (
	SELECT
		COALESCE(el.linked_strategy_entity_id, p.primary_entity_id) AS strategy_entity_id,
		COUNT(DISTINCT p.performance_entity_key)::integer AS total_kpi_count,
		COUNT(DISTINCT p.performance_entity_key) FILTER (WHERE p.target_value IS NOT NULL)::integer
			AS kpi_with_target,
		COUNT(DISTINCT p.performance_entity_key) FILTER (WHERE p.actual_value IS NOT NULL)::integer
			AS kpi_with_actual,
		AVG(p.achievement_pct) AS avg_achievement_pct
	FROM mart_strategy.bsc_performance_pivot p
	LEFT JOIN entity_links el
		ON el.performance_entity_key = p.performance_entity_key
	GROUP BY COALESCE(el.linked_strategy_entity_id, p.primary_entity_id)
)
SELECT
	e.strategy_entity_id,
	e.source_run_id,
	e.entity_origin,
	e.entity_name,
	e.entity_semantics,
	e.binding_model,
	e.resolution_status,
	e.strategy_tactic_label,
	e.ksu_flag,
	e.active_flag,
	e.department_code,
	COALESCE(e.primary_perspective_code, 'Не назначено'::text) AS perspective_code,
	e.horizon_code,
	e.multi_perspective_flag,
	COALESCE(b.has_confirmed_evidence_flag, false) AS has_confirmed_evidence_flag,
	COALESCE(b.has_derived_only_flag, false) AS has_derived_only_flag,
	COALESCE(b.document_count, 0) AS document_count,
	COALESCE(b.goal_count, 0) AS goal_count,
	COALESCE(b.task_count, 0) AS task_count,
	COALESCE(b.kpi_count, 0) AS kpi_count,
	COALESCE(b.candidate_metric_count, 0) AS candidate_metric_count,
	COALESCE(g.gap_count, 0) AS gap_count,
	COALESCE(p.total_kpi_count, 0) AS total_kpi_count,
	COALESCE(p.kpi_with_target, 0) AS kpi_with_target,
	COALESCE(p.kpi_with_actual, 0) AS kpi_with_actual,
	p.avg_achievement_pct,
	NULL::numeric AS weighted_score,
	NULL::numeric AS weight_pct,
	NULL::text AS weight_version_id,
	NULL::text AS weight_entity_level,
	NULL::text AS weight_entity_code,
	NULL::date AS weight_valid_from,
	NULL::date AS weight_valid_to,
	false AS weight_missing_flag,
	NULL::date AS weight_as_of_date,
	(
		COALESCE(b.goal_count, 0) + COALESCE(b.task_count, 0) + COALESCE(b.kpi_count, 0)
	)::integer AS coverage_items_total,
	(
		COALESCE(g.gap_count, 0) > 0
		OR COALESCE(b.kpi_count, 0) = 0
		OR COALESCE(b.has_derived_only_flag, false)
	) AS weak_entity_flag,
	CASE
		WHEN p.avg_achievement_pct IS NULL THEN 'Нет score'::text
		WHEN p.avg_achievement_pct >= 90 THEN 'Высокий'::text
		WHEN p.avg_achievement_pct >= 70 THEN 'Средний'::text
		ELSE 'Низкий'::text
	END AS score_band
FROM mart_strategy.strategy_entity_dim e
LEFT JOIN binding_agg b
	ON b.strategy_entity_id = e.strategy_entity_id
LEFT JOIN gap_agg g
	ON g.strategy_entity_id = e.strategy_entity_id
LEFT JOIN perf_agg p
	ON p.strategy_entity_id = e.strategy_entity_id
WHERE e.active_flag = true;

CREATE OR REPLACE VIEW mart_strategy.slobi_scorecard_overview AS
SELECT
	s.department_code,
	d.department_name,
	d.department_order,
	s.perspective_code,
	p.perspective_name,
	p.perspective_order,
	s.horizon_code,
	h.horizon_name,
	h.horizon_order,
	s.total_kpi_count,
	s.kpi_with_target,
	s.kpi_with_actual,
	s.avg_achievement_pct,
	s.weighted_score,
	s.goal_count,
	s.task_count,
	s.gap_count,
	s.weight_pct,
	s.weight_version_id,
	s.weight_entity_level,
	s.weight_entity_code,
	s.weight_valid_from,
	s.weight_valid_to,
	s.weight_missing_flag,
	s.weight_as_of_date,
	t.weighted_score_total,
	COALESCE(t.missing_weight_rows, 0::bigint) AS missing_weight_rows
FROM mart_strategy.bsc_scorecard_summary s
LEFT JOIN mart_strategy.bsc_scorecard_total_summary t
	ON NOT t.department_code IS DISTINCT FROM s.department_code
	AND NOT t.horizon_code IS DISTINCT FROM s.horizon_code
LEFT JOIN mart_strategy.bsc_departments_dim d
	ON d.department_code = s.department_code
LEFT JOIN mart_strategy.bsc_perspectives_dim p
	ON p.perspective_code = s.perspective_code
LEFT JOIN mart_strategy.bsc_horizons_dim h
	ON h.horizon_code = s.horizon_code;

CREATE OR REPLACE VIEW mart_strategy.slobi_performance_detail AS
WITH bridge_agg AS (
	SELECT
		pfb.performance_entity_key,
		MIN(pfb.fact_id) AS fact_id,
		MIN(pfb.doc_id) AS doc_id,
		COUNT(DISTINCT pfb.fact_id)::integer AS fact_id_count
	FROM mart_strategy.bsc_performance_fact_bridge pfb
	GROUP BY pfb.performance_entity_key
),
entity_links AS (
	SELECT
		pfb.performance_entity_key,
		MIN(fe.strategy_entity_id) AS linked_strategy_entity_id,
		COUNT(DISTINCT fe.strategy_entity_id)::integer AS entity_link_count
	FROM mart_strategy.bsc_performance_fact_bridge pfb
	LEFT JOIN mart_strategy.strategy_fact_entity_bridge fe
		ON fe.fact_id = pfb.fact_id
	GROUP BY pfb.performance_entity_key
)
SELECT
	p.performance_entity_key,
	p.source_run_id,
	COALESCE(el.linked_strategy_entity_id, p.primary_entity_id) AS strategy_entity_id,
	e.entity_name,
	e.entity_semantics,
	p.department_code,
	p.perspective_code,
	p.horizon_code,
	p.status_label,
	p.year_num,
	p.period_label,
	ba.fact_id,
	ba.doc_id,
	ba.fact_id_count,
	COALESCE(el.entity_link_count, 0) AS entity_link_count,
	p.fact_name,
	p.fact_class,
	p.metric_code,
	p.unit,
	p.target_value,
	p.actual_value,
	p.forecast_value,
	p.threshold_value,
	p.achievement_pct,
	p.deviation_abs,
	(p.target_value IS NOT NULL) AS has_target_flag,
	(p.actual_value IS NOT NULL) AS has_actual_flag,
	p.created_at
FROM mart_strategy.bsc_performance_pivot p
LEFT JOIN bridge_agg ba
	ON ba.performance_entity_key = p.performance_entity_key
LEFT JOIN entity_links el
	ON el.performance_entity_key = p.performance_entity_key
LEFT JOIN mart_strategy.strategy_entity_dim e
	ON e.strategy_entity_id = COALESCE(el.linked_strategy_entity_id, p.primary_entity_id);

CREATE OR REPLACE VIEW mart_strategy.slobi_cascade_detail AS
SELECT
	a.path_id,
	a.source_run_id,
	a.primary_entity_id AS strategy_entity_id,
	a.entity_name,
	a.entity_semantics,
	a.department_code,
	a.perspective_code,
	a.horizon_code,
	a.cascade_group_key,
	a.completeness_status,
	a.path_status,
	a.cycle_flag,
	a.orphan_flag,
	a.doc_id,
	a.document_full_name,
	a.document_type,
	a.registry_matched_flag,
	a.root_fact_id,
	a.root_doc_id,
	a.root_fact_name,
	a.root_fact_class,
	a.root_metric_code,
	a.goal_fact_id,
	a.goal_doc_id,
	a.goal_fact_name,
	a.goal_metric_code,
	a.task_fact_id,
	a.task_doc_id,
	a.task_fact_name,
	a.task_metric_code,
	a.kpi_fact_id,
	a.kpi_doc_id,
	a.kpi_fact_name,
	a.kpi_metric_code,
	a.leaf_fact_id,
	a.leaf_doc_id,
	a.leaf_fact_name,
	a.leaf_fact_class,
	a.leaf_metric_code,
	a.path_depth,
	a.lt_exists,
	a.mt_exists,
	a.st_exists,
	a.ot_exists,
	a.lt_mt_transition,
	a.mt_st_transition,
	a.st_ot_transition,
	a.created_at
FROM mart_strategy.bsc_alignment_path_enriched a;
