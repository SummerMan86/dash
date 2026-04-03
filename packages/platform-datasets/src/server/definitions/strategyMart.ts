import type { DatasetId, DatasetIr, DatasetQuery } from '../../model';
import { ir } from '../../model';

export const STRATEGY_MART_DATASETS = {
	entityOverview: 'strategy.entity_overview',
	scorecardOverview: 'strategy.scorecard_overview',
	performanceDetail: 'strategy.performance_detail',
	cascadeDetail: 'strategy.cascade_detail'
} as const satisfies Record<string, DatasetId>;

export type StrategyMartDatasetId =
	(typeof STRATEGY_MART_DATASETS)[keyof typeof STRATEGY_MART_DATASETS];

function asNumber(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)))
		return Number(value);
	return undefined;
}

function asString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed ? trimmed : undefined;
}

function clampLimit(value: unknown, fallback: number): number {
	const n = asNumber(value);
	if (typeof n !== 'number') return fallback;
	return Math.max(0, Math.min(50_000, Math.floor(n)));
}

function commonStrategyFilters(query: DatasetQuery) {
	const p = (query.params ?? {}) as Record<string, unknown>;
	const f = (query.filters ?? {}) as Record<string, unknown>;

	return {
		departmentCode: asString(p.departmentCode) || asString(f.departmentCode),
		perspectiveCode: asString(p.perspectiveCode) || asString(f.perspectiveCode),
		horizonCode: asString(p.horizonCode) || asString(f.horizonCode),
		strategyEntityId: asString(p.strategyEntityId) || asString(f.strategyEntityId),
		statusLabel: asString(p.statusLabel) || asString(f.statusLabel),
		pathStatus: asString(p.pathStatus) || asString(f.pathStatus),
		limit: clampLimit(p.limit, 500)
	};
}

export function compileStrategyMartDataset(
	datasetId: StrategyMartDatasetId,
	query: DatasetQuery
): DatasetIr {
	const filters = commonStrategyFilters(query);

	switch (datasetId) {
		case STRATEGY_MART_DATASETS.entityOverview: {
			const whereParts = [];
			if (filters.departmentCode) {
				whereParts.push(ir.eq(ir.col('department_code'), ir.lit(filters.departmentCode)));
			}
			if (filters.perspectiveCode) {
				whereParts.push(ir.eq(ir.col('perspective_code'), ir.lit(filters.perspectiveCode)));
			}
			if (filters.horizonCode) {
				whereParts.push(ir.eq(ir.col('horizon_code'), ir.lit(filters.horizonCode)));
			}
			if (filters.strategyEntityId) {
				whereParts.push(ir.eq(ir.col('strategy_entity_id'), ir.lit(filters.strategyEntityId)));
			}

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('strategy_entity_id') },
					{ expr: ir.col('source_run_id') },
					{ expr: ir.col('entity_origin') },
					{ expr: ir.col('entity_name') },
					{ expr: ir.col('entity_semantics') },
					{ expr: ir.col('binding_model') },
					{ expr: ir.col('resolution_status') },
					{ expr: ir.col('strategy_tactic_label') },
					{ expr: ir.col('ksu_flag') },
					{ expr: ir.col('active_flag') },
					{ expr: ir.col('department_code') },
					{ expr: ir.col('perspective_code') },
					{ expr: ir.col('horizon_code') },
					{ expr: ir.col('multi_perspective_flag') },
					{ expr: ir.col('has_confirmed_evidence_flag') },
					{ expr: ir.col('has_derived_only_flag') },
					{ expr: ir.col('document_count') },
					{ expr: ir.col('goal_count') },
					{ expr: ir.col('task_count') },
					{ expr: ir.col('kpi_count') },
					{ expr: ir.col('candidate_metric_count') },
					{ expr: ir.col('gap_count') },
					{ expr: ir.col('total_kpi_count') },
					{ expr: ir.col('kpi_with_target') },
					{ expr: ir.col('kpi_with_actual') },
					{ expr: ir.col('avg_achievement_pct') },
					{ expr: ir.col('weighted_score') },
					{ expr: ir.col('weight_pct') },
					{ expr: ir.col('weight_missing_flag') },
					{ expr: ir.col('coverage_items_total') },
					{ expr: ir.col('weak_entity_flag') },
					{ expr: ir.col('score_band') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('coverage_items_total'), dir: 'desc' },
					{ expr: ir.col('strategy_entity_id'), dir: 'asc' }
				],
				limit: clampLimit((query.params as Record<string, unknown> | undefined)?.limit, 5_000)
			};
		}

		case STRATEGY_MART_DATASETS.scorecardOverview: {
			const whereParts = [];
			if (filters.departmentCode) {
				whereParts.push(ir.eq(ir.col('department_code'), ir.lit(filters.departmentCode)));
			}
			if (filters.perspectiveCode) {
				whereParts.push(ir.eq(ir.col('perspective_code'), ir.lit(filters.perspectiveCode)));
			}
			if (filters.horizonCode) {
				whereParts.push(ir.eq(ir.col('horizon_code'), ir.lit(filters.horizonCode)));
			}

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('department_code') },
					{ expr: ir.col('department_name') },
					{ expr: ir.col('department_order') },
					{ expr: ir.col('perspective_code') },
					{ expr: ir.col('perspective_name') },
					{ expr: ir.col('perspective_order') },
					{ expr: ir.col('horizon_code') },
					{ expr: ir.col('horizon_name') },
					{ expr: ir.col('horizon_order') },
					{ expr: ir.col('total_kpi_count') },
					{ expr: ir.col('kpi_with_target') },
					{ expr: ir.col('kpi_with_actual') },
					{ expr: ir.col('avg_achievement_pct') },
					{ expr: ir.col('weighted_score') },
					{ expr: ir.col('goal_count') },
					{ expr: ir.col('task_count') },
					{ expr: ir.col('gap_count') },
					{ expr: ir.col('weight_pct') },
					{ expr: ir.col('weight_missing_flag') },
					{ expr: ir.col('weight_as_of_date') },
					{ expr: ir.col('weighted_score_total') },
					{ expr: ir.col('missing_weight_rows') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('department_order'), dir: 'asc' },
					{ expr: ir.col('horizon_order'), dir: 'asc' },
					{ expr: ir.col('perspective_order'), dir: 'asc' }
				],
				limit: clampLimit((query.params as Record<string, unknown> | undefined)?.limit, 2_000)
			};
		}

		case STRATEGY_MART_DATASETS.performanceDetail: {
			const whereParts = [];
			if (filters.departmentCode) {
				whereParts.push(ir.eq(ir.col('department_code'), ir.lit(filters.departmentCode)));
			}
			if (filters.perspectiveCode) {
				whereParts.push(ir.eq(ir.col('perspective_code'), ir.lit(filters.perspectiveCode)));
			}
			if (filters.horizonCode) {
				whereParts.push(ir.eq(ir.col('horizon_code'), ir.lit(filters.horizonCode)));
			}
			if (filters.strategyEntityId) {
				whereParts.push(ir.eq(ir.col('strategy_entity_id'), ir.lit(filters.strategyEntityId)));
			}
			if (filters.statusLabel) {
				whereParts.push(ir.eq(ir.col('status_label'), ir.lit(filters.statusLabel)));
			}

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('performance_entity_key') },
					{ expr: ir.col('source_run_id') },
					{ expr: ir.col('strategy_entity_id') },
					{ expr: ir.col('entity_name') },
					{ expr: ir.col('entity_semantics') },
					{ expr: ir.col('department_code') },
					{ expr: ir.col('perspective_code') },
					{ expr: ir.col('horizon_code') },
					{ expr: ir.col('status_label') },
					{ expr: ir.col('year_num') },
					{ expr: ir.col('period_label') },
					{ expr: ir.col('fact_id') },
					{ expr: ir.col('doc_id') },
					{ expr: ir.col('fact_id_count') },
					{ expr: ir.col('entity_link_count') },
					{ expr: ir.col('fact_name') },
					{ expr: ir.col('fact_class') },
					{ expr: ir.col('metric_code') },
					{ expr: ir.col('unit') },
					{ expr: ir.col('target_value') },
					{ expr: ir.col('actual_value') },
					{ expr: ir.col('forecast_value') },
					{ expr: ir.col('threshold_value') },
					{ expr: ir.col('achievement_pct') },
					{ expr: ir.col('deviation_abs') },
					{ expr: ir.col('has_target_flag') },
					{ expr: ir.col('has_actual_flag') },
					{ expr: ir.col('created_at') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('created_at'), dir: 'desc' },
					{ expr: ir.col('performance_entity_key'), dir: 'asc' }
				],
				limit: clampLimit((query.params as Record<string, unknown> | undefined)?.limit, 10_000)
			};
		}

		case STRATEGY_MART_DATASETS.cascadeDetail: {
			const whereParts = [];
			if (filters.departmentCode) {
				whereParts.push(ir.eq(ir.col('department_code'), ir.lit(filters.departmentCode)));
			}
			if (filters.perspectiveCode) {
				whereParts.push(ir.eq(ir.col('perspective_code'), ir.lit(filters.perspectiveCode)));
			}
			if (filters.horizonCode) {
				whereParts.push(ir.eq(ir.col('horizon_code'), ir.lit(filters.horizonCode)));
			}
			if (filters.strategyEntityId) {
				whereParts.push(ir.eq(ir.col('strategy_entity_id'), ir.lit(filters.strategyEntityId)));
			}
			if (filters.pathStatus) {
				whereParts.push(ir.eq(ir.col('path_status'), ir.lit(filters.pathStatus)));
			}

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('path_id') },
					{ expr: ir.col('source_run_id') },
					{ expr: ir.col('strategy_entity_id') },
					{ expr: ir.col('entity_name') },
					{ expr: ir.col('entity_semantics') },
					{ expr: ir.col('department_code') },
					{ expr: ir.col('perspective_code') },
					{ expr: ir.col('horizon_code') },
					{ expr: ir.col('cascade_group_key') },
					{ expr: ir.col('completeness_status') },
					{ expr: ir.col('path_status') },
					{ expr: ir.col('cycle_flag') },
					{ expr: ir.col('orphan_flag') },
					{ expr: ir.col('doc_id') },
					{ expr: ir.col('document_full_name') },
					{ expr: ir.col('document_type') },
					{ expr: ir.col('registry_matched_flag') },
					{ expr: ir.col('root_fact_id') },
					{ expr: ir.col('root_fact_name') },
					{ expr: ir.col('task_fact_id') },
					{ expr: ir.col('task_fact_name') },
					{ expr: ir.col('kpi_fact_id') },
					{ expr: ir.col('kpi_fact_name') },
					{ expr: ir.col('leaf_fact_id') },
					{ expr: ir.col('leaf_fact_name') },
					{ expr: ir.col('path_depth') },
					{ expr: ir.col('created_at') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('path_depth'), dir: 'desc' },
					{ expr: ir.col('path_id'), dir: 'asc' }
				],
				limit: clampLimit((query.params as Record<string, unknown> | undefined)?.limit, 5_000)
			};
		}
	}
}
