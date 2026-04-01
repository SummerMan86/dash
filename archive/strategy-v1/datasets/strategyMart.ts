import type { DatasetId, DatasetIr, DatasetQuery } from '$entities/dataset';
import { ir } from '$entities/dataset';

export const STRATEGY_MART_DATASETS = {
	documentsDim: 'strategy.documents_dim',
	metricDetail: 'strategy.metric_detail',
	kpiProvenance: 'strategy.kpi_provenance',
	cascadeCoverage: 'strategy.cascade_coverage',
	gapOverview: 'strategy.gap_overview',
	bscOverview: 'strategy.bsc_overview',
	sourceCoverage: 'strategy.source_coverage',
	executiveKpiV2: 'strategy.executive_kpi_v2',
	currentIntakeRun: 'strategy.current_intake_run',
	intakeReadyDocuments: 'strategy.intake_ready_documents',
	intakeReadyFacts: 'strategy.intake_ready_facts',
	intakeReadyLinks: 'strategy.intake_ready_links',
	intakeReadyGaps: 'strategy.intake_ready_gaps',
	intakeReadinessQa: 'strategy.intake_readiness_qa'
} as const satisfies Record<string, DatasetId>;

export type StrategyMartDatasetId =
	(typeof STRATEGY_MART_DATASETS)[keyof typeof STRATEGY_MART_DATASETS];

function asBoolean(value: unknown): boolean | undefined {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') {
		if (value === 'true') return true;
		if (value === 'false') return false;
	}
	return undefined;
}

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

function strategyDateRangeWhere(query: DatasetQuery, columnName: string) {
	const filters = (query.filters ?? {}) as Record<string, unknown>;
	const params = (query.params ?? {}) as Record<string, unknown>;
	const from = asString(filters.dateFrom) || asString(params.dateFrom);
	const to = asString(filters.dateTo) || asString(params.dateTo);
	if (!from && !to) return undefined;

	const parts = [];
	if (from) parts.push(ir.gte(ir.col(columnName), ir.lit(from)));
	if (to) parts.push(ir.lte(ir.col(columnName), ir.lit(to)));
	return parts.length === 1 ? parts[0] : ir.and(parts);
}

function commonFilters(
	query: DatasetQuery,
	columns: {
		departmentCode?: string;
		perspectiveCode?: string;
		horizonCode?: string;
		metricCode?: string;
		periodKey?: string;
		documentCode?: string;
		chainId?: string;
		recordSource?: string;
		gapFlag?: string;
	},
	dateColumn?: string
) {
	const p = (query.params ?? {}) as Record<string, unknown>;
	const f = (query.filters ?? {}) as Record<string, unknown>;

	const departmentCode = asString(p.departmentCode) || asString(f.departmentCode);
	const perspectiveCode = asString(p.perspectiveCode) || asString(f.perspectiveCode);
	const horizonCode = asString(p.horizonCode) || asString(f.horizonCode);
	const metricCode = asString(p.metricCode) || asString(f.metricCode);
	const periodKey = asString(p.periodKey) || asString(f.periodKey);
	const documentCode = asString(p.documentCode) || asString(f.documentCode);
	const chainId = asString(p.chainId) || asString(f.chainId);
	const recordSource = asString(p.recordSource) || asString(f.recordSource);
	const gapOnly = asBoolean(p.gapOnly ?? f.gapOnly);

	const whereParts = [];
	if (dateColumn) {
		const rangeWhere = strategyDateRangeWhere(query, dateColumn);
		if (rangeWhere) whereParts.push(rangeWhere);
	}
	if (departmentCode && columns.departmentCode) {
		whereParts.push(ir.eq(ir.col(columns.departmentCode), ir.lit(departmentCode)));
	}
	if (perspectiveCode && columns.perspectiveCode) {
		whereParts.push(ir.eq(ir.col(columns.perspectiveCode), ir.lit(perspectiveCode)));
	}
	if (horizonCode && columns.horizonCode) {
		whereParts.push(ir.eq(ir.col(columns.horizonCode), ir.lit(horizonCode)));
	}
	if (metricCode && columns.metricCode) {
		whereParts.push(ir.eq(ir.col(columns.metricCode), ir.lit(metricCode)));
	}
	if (periodKey && columns.periodKey) {
		whereParts.push(ir.eq(ir.col(columns.periodKey), ir.lit(periodKey)));
	}
	if (documentCode && columns.documentCode) {
		whereParts.push(ir.eq(ir.col(columns.documentCode), ir.lit(documentCode)));
	}
	if (chainId && columns.chainId) {
		whereParts.push(ir.eq(ir.col(columns.chainId), ir.lit(chainId)));
	}
	if (recordSource && columns.recordSource) {
		whereParts.push(ir.eq(ir.col(columns.recordSource), ir.lit(recordSource)));
	}
	if (gapOnly && columns.gapFlag) {
		whereParts.push(ir.eq(ir.col(columns.gapFlag), ir.lit(true)));
	}

	return whereParts;
}

export function compileStrategyMartDataset(
	datasetId: StrategyMartDatasetId,
	query: DatasetQuery
): DatasetIr {
	const p = (query.params ?? {}) as Record<string, unknown>;

	switch (datasetId) {
		case STRATEGY_MART_DATASETS.documentsDim: {
			const whereParts = commonFilters(
				query,
				{
					departmentCode: 'department_code',
					perspectiveCode: 'perspective_code',
					horizonCode: 'horizon_code',
					documentCode: 'document_code'
				},
				undefined
			);
			const limit = clampLimit(p.limit, 500);

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('batch_id') },
					{ expr: ir.col('document_code') },
					{ expr: ir.col('document_name') },
					{ expr: ir.col('document_file') },
					{ expr: ir.col('horizon_code') },
					{ expr: ir.col('department_code') },
					{ expr: ir.col('perspective_code') },
					{ expr: ir.col('source_system') },
					{ expr: ir.col('source_kind') },
					{ expr: ir.col('record_origin') },
					{ expr: ir.col('version_label') },
					{ expr: ir.col('status') },
					{ expr: ir.col('current_flag') },
					{ expr: ir.col('source_locator') },
					{ expr: ir.col('occurrence_count') },
					{ expr: ir.col('loaded_at') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('horizon_code'), dir: 'asc' },
					{ expr: ir.col('document_name'), dir: 'asc' }
				],
				limit
			};
		}

		case STRATEGY_MART_DATASETS.metricDetail: {
			const whereParts = commonFilters(
				query,
				{
					departmentCode: 'department_code',
					perspectiveCode: 'perspective_code',
					horizonCode: 'horizon_code',
					metricCode: 'metric_code',
					periodKey: 'period_key',
					documentCode: 'document_code',
					chainId: 'chain_id',
					recordSource: 'record_source'
				},
				'period_date'
			);
			const limit = clampLimit(p.limit, 2_000);

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('batch_id') },
					{ expr: ir.col('record_id') },
					{ expr: ir.col('record_source') },
					{ expr: ir.col('node_id') },
					{ expr: ir.col('parent_node_id') },
					{ expr: ir.col('chain_id') },
					{ expr: ir.col('document_code') },
					{ expr: ir.col('document_name') },
					{ expr: ir.col('document_file') },
					{ expr: ir.col('horizon_code') },
					{ expr: ir.col('horizon_name') },
					{ expr: ir.col('perspective_code') },
					{ expr: ir.col('perspective_name') },
					{ expr: ir.col('metric_code') },
					{ expr: ir.col('metric_name') },
					{ expr: ir.col('period_key') },
					{ expr: ir.col('period_date') },
					{ expr: ir.col('entity_level') },
					{ expr: ir.col('entity_code') },
					{ expr: ir.col('subject_area') },
					{ expr: ir.col('department_code') },
					{ expr: ir.col('project_code') },
					{ expr: ir.col('object_code') },
					{ expr: ir.col('target_value') },
					{ expr: ir.col('actual_value') },
					{ expr: ir.col('metric_value') },
					{ expr: ir.col('metric_value_text') },
					{ expr: ir.col('unit') },
					{ expr: ir.col('aggregation_rule') },
					{ expr: ir.col('weight_pct') },
					{ expr: ir.col('tolerance_abs') },
					{ expr: ir.col('tolerance_pct') },
					{ expr: ir.col('higher_is_better_flag') },
					{ expr: ir.col('requires_actual_flag') },
					{ expr: ir.col('extractability') },
					{ expr: ir.col('child_count') },
					{ expr: ir.col('has_children_flag') },
					{ expr: ir.col('is_leaf_flag') },
					{ expr: ir.col('source_locator') },
					{ expr: ir.col('source_page') },
					{ expr: ir.col('comment') },
					{ expr: ir.col('loaded_at') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('period_date'), dir: 'asc' },
					{ expr: ir.col('metric_code'), dir: 'asc' },
					{ expr: ir.col('node_id'), dir: 'asc' }
				],
				limit
			};
		}

		case STRATEGY_MART_DATASETS.kpiProvenance: {
			const whereParts = commonFilters(
				query,
				{
					departmentCode: 'department_code',
					perspectiveCode: 'perspective_code',
					horizonCode: 'horizon_code',
					metricCode: 'metric_code',
					periodKey: 'period_key',
					documentCode: 'document_code',
					chainId: 'chain_id',
					recordSource: 'record_source'
				},
				'period_date'
			);
			const limit = clampLimit(p.limit, 10_000);

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('batch_id') },
					{ expr: ir.col('record_id') },
					{ expr: ir.col('chain_id') },
					{ expr: ir.col('document_code') },
					{ expr: ir.col('document_name') },
					{ expr: ir.col('document_file') },
					{ expr: ir.col('horizon_code') },
					{ expr: ir.col('horizon_name') },
					{ expr: ir.col('perspective_code') },
					{ expr: ir.col('perspective_name') },
					{ expr: ir.col('metric_code') },
					{ expr: ir.col('metric_name') },
					{ expr: ir.col('period_key') },
					{ expr: ir.col('period_date') },
					{ expr: ir.col('department_code') },
					{ expr: ir.col('record_source') },
					{ expr: ir.col('target_value') },
					{ expr: ir.col('actual_value') },
					{ expr: ir.col('metric_value') },
					{ expr: ir.col('metric_value_text') },
					{ expr: ir.col('unit') },
					{ expr: ir.col('extractability') },
					{ expr: ir.col('source_locator') },
					{ expr: ir.col('source_page') },
					{ expr: ir.col('loaded_at') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('metric_code'), dir: 'asc' },
					{ expr: ir.col('period_date'), dir: 'desc' },
					{ expr: ir.col('horizon_code'), dir: 'asc' },
					{ expr: ir.col('document_name'), dir: 'asc' },
					{ expr: ir.col('source_page'), dir: 'asc' },
					{ expr: ir.col('source_locator'), dir: 'asc' }
				],
				limit
			};
		}

		case STRATEGY_MART_DATASETS.cascadeCoverage: {
			const whereParts = commonFilters(query, {
				departmentCode: 'department_code',
				documentCode: undefined,
				chainId: 'chain_id'
			});
			const limit = clampLimit(p.limit, 500);

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('batch_id') },
					{ expr: ir.col('chain_id') },
					{ expr: ir.col('department_code') },
					{ expr: ir.col('project_code') },
					{ expr: ir.col('object_code') },
					{ expr: ir.col('cascade_subject') },
					{ expr: ir.col('lt_mt_exists') },
					{ expr: ir.col('mt_st_exists') },
					{ expr: ir.col('st_ot_exists') },
					{ expr: ir.col('required_transition_count') },
					{ expr: ir.col('existing_transition_count') },
					{ expr: ir.col('missing_transition_count') },
					{ expr: ir.col('coverage_pct') },
					{ expr: ir.col('missing_transitions') },
					{ expr: ir.col('coverage_status') },
					{ expr: ir.col('loaded_at') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('missing_transition_count'), dir: 'desc' },
					{ expr: ir.col('chain_id'), dir: 'asc' }
				],
				limit
			};
		}

		case STRATEGY_MART_DATASETS.gapOverview: {
			const whereParts = commonFilters(
				query,
				{
					departmentCode: 'department_code',
					perspectiveCode: 'perspective_code',
					horizonCode: 'parent_horizon_code',
					metricCode: 'metric_code',
					documentCode: 'parent_document_code',
					chainId: 'chain_id',
					gapFlag: 'gap_flag'
				},
				'period_date'
			);
			const limit = clampLimit(p.limit, 1_000);

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('batch_id') },
					{ expr: ir.col('chain_id') },
					{ expr: ir.col('parent_node_id') },
					{ expr: ir.col('parent_document_code') },
					{ expr: ir.col('parent_document_name') },
					{ expr: ir.col('parent_horizon_code') },
					{ expr: ir.col('parent_horizon_name') },
					{ expr: ir.col('perspective_code') },
					{ expr: ir.col('perspective_name') },
					{ expr: ir.col('metric_code') },
					{ expr: ir.col('metric_name') },
					{ expr: ir.col('period_key') },
					{ expr: ir.col('period_date') },
					{ expr: ir.col('department_code') },
					{ expr: ir.col('project_code') },
					{ expr: ir.col('object_code') },
					{ expr: ir.col('unit') },
					{ expr: ir.col('aggregation_rule') },
					{ expr: ir.col('parent_target_value') },
					{ expr: ir.col('parent_actual_value') },
					{ expr: ir.col('child_count') },
					{ expr: ir.col('child_rollup_target') },
					{ expr: ir.col('child_rollup_actual') },
					{ expr: ir.col('gap_abs') },
					{ expr: ir.col('gap_pct') },
					{ expr: ir.col('actual_gap_abs') },
					{ expr: ir.col('actual_gap_pct') },
					{ expr: ir.col('tolerance_abs') },
					{ expr: ir.col('tolerance_pct') },
					{ expr: ir.col('gap_flag') },
					{ expr: ir.col('gap_status') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('gap_flag'), dir: 'desc' },
					{ expr: ir.col('period_date'), dir: 'asc' },
					{ expr: ir.col('metric_code'), dir: 'asc' }
				],
				limit
			};
		}

		case STRATEGY_MART_DATASETS.bscOverview: {
			const whereParts = commonFilters(
				query,
				{
					departmentCode: 'department_code',
					perspectiveCode: 'perspective_code',
					horizonCode: 'horizon_code'
				},
				'period_date'
			);
			const limit = clampLimit(p.limit, 1_000);

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('batch_id') },
					{ expr: ir.col('perspective_code') },
					{ expr: ir.col('perspective_name') },
					{ expr: ir.col('horizon_code') },
					{ expr: ir.col('horizon_name') },
					{ expr: ir.col('period_key') },
					{ expr: ir.col('period_date') },
					{ expr: ir.col('scope_kind') },
					{ expr: ir.col('scope_code') },
					{ expr: ir.col('department_code') },
					{ expr: ir.col('project_code') },
					{ expr: ir.col('object_code') },
					{ expr: ir.col('weight_pct') },
					{ expr: ir.col('target_score') },
					{ expr: ir.col('actual_score') },
					{ expr: ir.col('weighted_target_score') },
					{ expr: ir.col('weighted_actual_score') },
					{ expr: ir.col('score_gap') },
					{ expr: ir.col('kpi_count') },
					{ expr: ir.col('kpi_with_actual_count') },
					{ expr: ir.col('kpi_with_gap_count') },
					{ expr: ir.col('average_target_value') },
					{ expr: ir.col('average_actual_value') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('period_date'), dir: 'asc' },
					{ expr: ir.col('perspective_code'), dir: 'asc' },
					{ expr: ir.col('scope_kind'), dir: 'asc' }
				],
				limit
			};
		}

		case STRATEGY_MART_DATASETS.sourceCoverage: {
			const whereParts = commonFilters(
				query,
				{
					departmentCode: 'department_code',
					perspectiveCode: 'perspective_code',
					horizonCode: 'horizon_code',
					metricCode: undefined,
					documentCode: 'source_code'
				},
				undefined
			);
			const limit = clampLimit(p.limit, 500);

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('batch_id') },
					{ expr: ir.col('record_source') },
					{ expr: ir.col('source_code') },
					{ expr: ir.col('source_name') },
					{ expr: ir.col('source_file') },
					{ expr: ir.col('horizon_code') },
					{ expr: ir.col('horizon_name') },
					{ expr: ir.col('department_code') },
					{ expr: ir.col('perspective_code') },
					{ expr: ir.col('record_count') },
					{ expr: ir.col('distinct_metric_count') },
					{ expr: ir.col('high_confidence_count') },
					{ expr: ir.col('medium_confidence_count') },
					{ expr: ir.col('low_confidence_count') },
					{ expr: ir.col('source_available_flag') },
					{ expr: ir.col('ot_available_flag') },
					{ expr: ir.col('min_period_key') },
					{ expr: ir.col('max_period_key') },
					{ expr: ir.col('loaded_at') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('horizon_code'), dir: 'asc' },
					{ expr: ir.col('record_count'), dir: 'desc' },
					{ expr: ir.col('source_name'), dir: 'asc' }
				],
				limit
			};
		}

		case STRATEGY_MART_DATASETS.executiveKpiV2: {
			const whereParts = commonFilters(
				query,
				{
					departmentCode: 'department_code',
					perspectiveCode: 'perspective_code',
					horizonCode: 'display_horizon_code',
					metricCode: 'metric_code',
					chainId: 'chain_id'
				},
				'display_period_date'
			);
			const limit = clampLimit(p.limit, 100);

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('batch_id') },
					{ expr: ir.col('registry_version') },
					{ expr: ir.col('curated_kpi_id') },
					{ expr: ir.col('display_order') },
					{ expr: ir.col('chain_id') },
					{ expr: ir.col('executive_label') },
					{ expr: ir.col('dashboard_group') },
					{ expr: ir.col('department_code') },
					{ expr: ir.col('perspective_code') },
					{ expr: ir.col('metric_code') },
					{ expr: ir.col('metric_name') },
					{ expr: ir.col('unit') },
					{ expr: ir.col('node_count') },
					{ expr: ir.col('document_count') },
					{ expr: ir.col('horizon_count') },
					{ expr: ir.col('horizons_present') },
					{ expr: ir.col('has_parent_child_flag') },
					{ expr: ir.col('latest_horizon_code') },
					{ expr: ir.col('latest_horizon_name') },
					{ expr: ir.col('latest_period_key') },
					{ expr: ir.col('latest_period_date') },
					{ expr: ir.col('latest_target_value') },
					{ expr: ir.col('latest_actual_value') },
					{ expr: ir.col('latest_metric_value') },
					{ expr: ir.col('latest_document_code') },
					{ expr: ir.col('latest_document_name') },
					{ expr: ir.col('latest_document_file') },
					{ expr: ir.col('show_numeric_value_flag') },
					{ expr: ir.col('display_value_numeric') },
					{ expr: ir.col('display_value_text') },
					{ expr: ir.col('display_unit') },
					{ expr: ir.col('display_horizon_code') },
					{ expr: ir.col('display_horizon_name') },
					{ expr: ir.col('display_period_key') },
					{ expr: ir.col('display_period_date') },
					{ expr: ir.col('value_confidence_status') },
					{ expr: ir.col('display_value_source') },
					{ expr: ir.col('numeric_gap_status') },
					{ expr: ir.col('numeric_gap_pct') },
					{ expr: ir.col('numeric_gap_abs') },
					{ expr: ir.col('department_coverage_status') },
					{ expr: ir.col('department_coverage_pct') },
					{ expr: ir.col('department_missing_transitions') },
					{ expr: ir.col('readiness_status') },
					{ expr: ir.col('can_show_to_management') },
					{ expr: ir.col('data_available_flag') },
					{ expr: ir.col('management_note') },
					{ expr: ir.col('required_action') },
					{ expr: ir.col('loaded_at') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('display_order'), dir: 'asc' },
					{ expr: ir.col('executive_label'), dir: 'asc' }
				],
				limit
			};
		}

		case STRATEGY_MART_DATASETS.currentIntakeRun: {
			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('run_id') },
					{ expr: ir.col('run_label') },
					{ expr: ir.col('workbook_version') },
					{ expr: ir.col('run_status') },
					{ expr: ir.col('source_root') },
					{ expr: ir.col('created_at') },
					{ expr: ir.col('started_at') },
					{ expr: ir.col('completed_at') }
				],
				limit: 1
			};
		}

		case STRATEGY_MART_DATASETS.intakeReadyDocuments: {
			const whereParts = commonFilters(query, {
				departmentCode: 'department_code',
				perspectiveCode: 'perspective_code',
				horizonCode: 'horizon_code'
			});
			const f = (query.filters ?? {}) as Record<string, unknown>;
			const docId = asString(p.docId) || asString(f.docId);
			const sourceDocumentCode = asString(p.sourceDocumentCode) || asString(f.sourceDocumentCode);
			const statusCode = asString(p.statusCode) || asString(f.statusCode);
			const limit = clampLimit(p.limit, 1_000);

			if (docId) whereParts.push(ir.eq(ir.col('doc_id'), ir.lit(docId)));
			if (sourceDocumentCode) {
				whereParts.push(ir.eq(ir.col('source_document_code'), ir.lit(sourceDocumentCode)));
			}
			if (statusCode) whereParts.push(ir.eq(ir.col('status_code'), ir.lit(statusCode)));

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('run_id') },
					{ expr: ir.col('task_id') },
					{ expr: ir.col('source_document_code') },
					{ expr: ir.col('source_document_file') },
					{ expr: ir.col('agent_code') },
					{ expr: ir.col('agent_label') },
					{ expr: ir.col('doc_id') },
					{ expr: ir.col('document_short_name') },
					{ expr: ir.col('document_full_name') },
					{ expr: ir.col('document_type') },
					{ expr: ir.col('document_kind') },
					{ expr: ir.col('department_code') },
					{ expr: ir.col('department_name') },
					{ expr: ir.col('horizon_code') },
					{ expr: ir.col('horizon_name') },
					{ expr: ir.col('period_label') },
					{ expr: ir.col('status_code') },
					{ expr: ir.col('status_name') },
					{ expr: ir.col('perspective_code') },
					{ expr: ir.col('perspective_name') },
					{ expr: ir.col('document_goal') },
					{ expr: ir.col('key_tasks') },
					{ expr: ir.col('main_objects') },
					{ expr: ir.col('main_stages') },
					{ expr: ir.col('main_projects') },
					{ expr: ir.col('approved_by') },
					{ expr: ir.col('actualization_date_raw') },
					{ expr: ir.col('actualization_date') },
					{ expr: ir.col('version_label') },
					{ expr: ir.col('source_page') },
					{ expr: ir.col('source_section') },
					{ expr: ir.col('manually_verified_flag') },
					{ expr: ir.col('ready_for_dwh_flag') },
					{ expr: ir.col('dq_comment') },
					{ expr: ir.col('created_at') },
					{ expr: ir.col('updated_at') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('horizon_code'), dir: 'asc' },
					{ expr: ir.col('department_code'), dir: 'asc' },
					{ expr: ir.col('document_full_name'), dir: 'asc' }
				],
				limit
			};
		}

		case STRATEGY_MART_DATASETS.intakeReadyFacts: {
			const whereParts = commonFilters(query, {
				departmentCode: 'department_code',
				perspectiveCode: 'perspective_code',
				horizonCode: 'horizon_code',
				metricCode: 'metric_code',
				chainId: 'chain_id'
			});
			const f = (query.filters ?? {}) as Record<string, unknown>;
			const docId = asString(p.docId) || asString(f.docId);
			const sourceDocumentCode = asString(p.sourceDocumentCode) || asString(f.sourceDocumentCode);
			const factClass = asString(p.factClass) || asString(f.factClass);
			const valueType = asString(p.valueType) || asString(f.valueType);
			const sourceType = asString(p.sourceType) || asString(f.sourceType);
			const confidenceLabel = asString(p.confidenceLabel) || asString(f.confidenceLabel);
			const extractionMethod = asString(p.extractionMethod) || asString(f.extractionMethod);
			const limit = clampLimit(p.limit, 5_000);

			if (docId) whereParts.push(ir.eq(ir.col('doc_id'), ir.lit(docId)));
			if (sourceDocumentCode) {
				whereParts.push(ir.eq(ir.col('source_document_code'), ir.lit(sourceDocumentCode)));
			}
			if (factClass) whereParts.push(ir.eq(ir.col('fact_class'), ir.lit(factClass)));
			if (valueType) whereParts.push(ir.eq(ir.col('value_type'), ir.lit(valueType)));
			if (sourceType) whereParts.push(ir.eq(ir.col('source_type'), ir.lit(sourceType)));
			if (confidenceLabel) {
				whereParts.push(ir.eq(ir.col('confidence_label'), ir.lit(confidenceLabel)));
			}
			if (extractionMethod) {
				whereParts.push(ir.eq(ir.col('extraction_method'), ir.lit(extractionMethod)));
			}

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('run_id') },
					{ expr: ir.col('task_id') },
					{ expr: ir.col('source_document_code') },
					{ expr: ir.col('source_document_file') },
					{ expr: ir.col('agent_code') },
					{ expr: ir.col('agent_label') },
					{ expr: ir.col('fact_id') },
					{ expr: ir.col('doc_id') },
					{ expr: ir.col('fact_class') },
					{ expr: ir.col('value_type') },
					{ expr: ir.col('metric_code') },
					{ expr: ir.col('fact_name') },
					{ expr: ir.col('department_code') },
					{ expr: ir.col('horizon_code') },
					{ expr: ir.col('perspective_code') },
					{ expr: ir.col('scenario_version') },
					{ expr: ir.col('object_name') },
					{ expr: ir.col('stage_name') },
					{ expr: ir.col('project_name') },
					{ expr: ir.col('discipline_name') },
					{ expr: ir.col('period_label') },
					{ expr: ir.col('year_num') },
					{ expr: ir.col('period_part') },
					{ expr: ir.col('unit') },
					{ expr: ir.col('value_operator') },
					{ expr: ir.col('numeric_value') },
					{ expr: ir.col('text_value') },
					{ expr: ir.col('raw_value') },
					{ expr: ir.col('currency_code') },
					{ expr: ir.col('aggregation_rule') },
					{ expr: ir.col('score_direction') },
					{ expr: ir.col('tolerance_abs') },
					{ expr: ir.col('tolerance_pct') },
					{ expr: ir.col('parent_fact_id') },
					{ expr: ir.col('parent_kpi_id') },
					{ expr: ir.col('chain_id') },
					{ expr: ir.col('source_type') },
					{ expr: ir.col('source_path') },
					{ expr: ir.col('source_page') },
					{ expr: ir.col('source_section') },
					{ expr: ir.col('source_row_ref') },
					{ expr: ir.col('extraction_method') },
					{ expr: ir.col('confidence_label') },
					{ expr: ir.col('manually_verified_flag') },
					{ expr: ir.col('ready_for_dwh_flag') },
					{ expr: ir.col('comment') },
					{ expr: ir.col('created_at') },
					{ expr: ir.col('updated_at') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('doc_id'), dir: 'asc' },
					{ expr: ir.col('fact_class'), dir: 'asc' },
					{ expr: ir.col('fact_id'), dir: 'asc' }
				],
				limit
			};
		}

		case STRATEGY_MART_DATASETS.intakeReadyLinks: {
			const whereParts = commonFilters(query, {
				chainId: 'chain_id'
			});
			const f = (query.filters ?? {}) as Record<string, unknown>;
			const relId = asString(p.relId) || asString(f.relId);
			const sourceDocumentCode = asString(p.sourceDocumentCode) || asString(f.sourceDocumentCode);
			const relationType = asString(p.relationType) || asString(f.relationType);
			const sourceEntityType = asString(p.sourceEntityType) || asString(f.sourceEntityType);
			const targetEntityType = asString(p.targetEntityType) || asString(f.targetEntityType);
			const linkStatus = asString(p.linkStatus) || asString(f.linkStatus);
			const sourceHorizonCode = asString(p.sourceHorizonCode) || asString(f.sourceHorizonCode);
			const targetHorizonCode = asString(p.targetHorizonCode) || asString(f.targetHorizonCode);
			const limit = clampLimit(p.limit, 5_000);

			if (relId) whereParts.push(ir.eq(ir.col('rel_id'), ir.lit(relId)));
			if (sourceDocumentCode) {
				whereParts.push(ir.eq(ir.col('source_document_code'), ir.lit(sourceDocumentCode)));
			}
			if (relationType) {
				whereParts.push(ir.eq(ir.col('relation_type'), ir.lit(relationType)));
			}
			if (sourceEntityType) {
				whereParts.push(ir.eq(ir.col('source_entity_type'), ir.lit(sourceEntityType)));
			}
			if (targetEntityType) {
				whereParts.push(ir.eq(ir.col('target_entity_type'), ir.lit(targetEntityType)));
			}
			if (linkStatus) {
				whereParts.push(ir.eq(ir.col('link_status'), ir.lit(linkStatus)));
			}
			if (sourceHorizonCode) {
				whereParts.push(ir.eq(ir.col('source_horizon_code'), ir.lit(sourceHorizonCode)));
			}
			if (targetHorizonCode) {
				whereParts.push(ir.eq(ir.col('target_horizon_code'), ir.lit(targetHorizonCode)));
			}

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('run_id') },
					{ expr: ir.col('task_id') },
					{ expr: ir.col('source_document_code') },
					{ expr: ir.col('source_document_file') },
					{ expr: ir.col('agent_code') },
					{ expr: ir.col('agent_label') },
					{ expr: ir.col('rel_id') },
					{ expr: ir.col('relation_type') },
					{ expr: ir.col('source_entity_type') },
					{ expr: ir.col('source_entity_id') },
					{ expr: ir.col('source_entity_name') },
					{ expr: ir.col('target_entity_type') },
					{ expr: ir.col('target_entity_id') },
					{ expr: ir.col('target_entity_name') },
					{ expr: ir.col('source_horizon_code') },
					{ expr: ir.col('target_horizon_code') },
					{ expr: ir.col('chain_id') },
					{ expr: ir.col('link_status') },
					{ expr: ir.col('structural_gap_flag') },
					{ expr: ir.col('numeric_gap_flag') },
					{ expr: ir.col('link_description') },
					{ expr: ir.col('source_path') },
					{ expr: ir.col('source_page') },
					{ expr: ir.col('comment') },
					{ expr: ir.col('created_at') },
					{ expr: ir.col('updated_at') },
					{ expr: ir.col('ready_for_dwh_flag') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('relation_type'), dir: 'asc' },
					{ expr: ir.col('source_entity_type'), dir: 'asc' },
					{ expr: ir.col('rel_id'), dir: 'asc' }
				],
				limit
			};
		}

		case STRATEGY_MART_DATASETS.intakeReadyGaps: {
			const whereParts = commonFilters(query, {
				perspectiveCode: 'perspective_code',
				chainId: 'chain_id'
			});
			const f = (query.filters ?? {}) as Record<string, unknown>;
			const gapId = asString(p.gapId) || asString(f.gapId);
			const sourceDocumentCode = asString(p.sourceDocumentCode) || asString(f.sourceDocumentCode);
			const gapCategoryCode = asString(p.gapCategoryCode) || asString(f.gapCategoryCode);
			const criticalityCode = asString(p.criticalityCode) || asString(f.criticalityCode);
			const factId = asString(p.factId) || asString(f.factId);
			const relId = asString(p.relId) || asString(f.relId);
			const limit = clampLimit(p.limit, 5_000);

			if (gapId) whereParts.push(ir.eq(ir.col('gap_id'), ir.lit(gapId)));
			if (sourceDocumentCode) {
				whereParts.push(ir.eq(ir.col('source_document_code'), ir.lit(sourceDocumentCode)));
			}
			if (gapCategoryCode) {
				whereParts.push(ir.eq(ir.col('gap_category_code'), ir.lit(gapCategoryCode)));
			}
			if (criticalityCode) {
				whereParts.push(ir.eq(ir.col('criticality_code'), ir.lit(criticalityCode)));
			}
			if (factId) whereParts.push(ir.eq(ir.col('fact_id'), ir.lit(factId)));
			if (relId) whereParts.push(ir.eq(ir.col('rel_id'), ir.lit(relId)));

			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('run_id') },
					{ expr: ir.col('task_id') },
					{ expr: ir.col('source_document_code') },
					{ expr: ir.col('source_document_file') },
					{ expr: ir.col('agent_code') },
					{ expr: ir.col('agent_label') },
					{ expr: ir.col('gap_id') },
					{ expr: ir.col('gap_category_code') },
					{ expr: ir.col('gap_type_name') },
					{ expr: ir.col('criticality_code') },
					{ expr: ir.col('gap_status') },
					{ expr: ir.col('doc_id_1') },
					{ expr: ir.col('doc_id_2') },
					{ expr: ir.col('fact_id') },
					{ expr: ir.col('kpi_id') },
					{ expr: ir.col('rel_id') },
					{ expr: ir.col('chain_id') },
					{ expr: ir.col('gap_description') },
					{ expr: ir.col('impact_text') },
					{ expr: ir.col('recommendation_text') },
					{ expr: ir.col('owner_name') },
					{ expr: ir.col('due_date') },
					{ expr: ir.col('perspective_code') },
					{ expr: ir.col('source_path') },
					{ expr: ir.col('source_page') },
					{ expr: ir.col('dq_comment') },
					{ expr: ir.col('created_at') },
					{ expr: ir.col('updated_at') },
					{ expr: ir.col('ready_for_dwh_flag') }
				],
				...(whereParts.length
					? { where: whereParts.length === 1 ? whereParts[0] : ir.and(whereParts) }
					: {}),
				orderBy: [
					{ expr: ir.col('criticality_code'), dir: 'asc' },
					{ expr: ir.col('gap_category_code'), dir: 'asc' },
					{ expr: ir.col('gap_id'), dir: 'asc' }
				],
				limit
			};
		}

		case STRATEGY_MART_DATASETS.intakeReadinessQa: {
			return {
				kind: 'select',
				from: { kind: 'dataset', id: datasetId },
				select: [
					{ expr: ir.col('run_id') },
					{ expr: ir.col('run_label') },
					{ expr: ir.col('workbook_version') },
					{ expr: ir.col('run_status') },
					{ expr: ir.col('source_root') },
					{ expr: ir.col('created_at') },
					{ expr: ir.col('started_at') },
					{ expr: ir.col('completed_at') },
					{ expr: ir.col('total_document_rows') },
					{ expr: ir.col('ready_document_rows') },
					{ expr: ir.col('hold_document_rows') },
					{ expr: ir.col('total_fact_rows') },
					{ expr: ir.col('ready_fact_rows') },
					{ expr: ir.col('hold_fact_rows') },
					{ expr: ir.col('ready_noncanonical_value_type_rows') },
					{ expr: ir.col('ready_noncanonical_fact_perspective_rows') },
					{ expr: ir.col('final_holdout_row_count') },
					{ expr: ir.col('ready_document_horizon_counts') },
					{ expr: ir.col('ready_document_perspective_counts') },
					{ expr: ir.col('ready_document_status_counts') },
					{ expr: ir.col('ready_document_department_counts') },
					{ expr: ir.col('ready_fact_class_counts') },
					{ expr: ir.col('ready_fact_value_type_counts') },
					{ expr: ir.col('ready_fact_source_type_counts') },
					{ expr: ir.col('ready_fact_extraction_method_counts') },
					{ expr: ir.col('ready_fact_confidence_counts') },
					{ expr: ir.col('ready_fact_perspective_counts') },
					{ expr: ir.col('total_link_rows') },
					{ expr: ir.col('ready_link_rows') },
					{ expr: ir.col('hold_link_rows') },
					{ expr: ir.col('total_gap_rows') },
					{ expr: ir.col('ready_gap_rows') },
					{ expr: ir.col('hold_gap_rows') },
					{ expr: ir.col('ready_noncanonical_relation_type_rows') },
					{ expr: ir.col('ready_noncanonical_source_entity_type_rows') },
					{ expr: ir.col('ready_noncanonical_target_entity_type_rows') },
					{ expr: ir.col('ready_noncanonical_link_status_rows') },
					{ expr: ir.col('ready_noncanonical_gap_category_rows') },
					{ expr: ir.col('ready_noncanonical_gap_criticality_rows') },
					{ expr: ir.col('ready_noncanonical_gap_perspective_rows') },
					{ expr: ir.col('ready_link_relation_type_counts') },
					{ expr: ir.col('ready_link_source_entity_type_counts') },
					{ expr: ir.col('ready_link_target_entity_type_counts') },
					{ expr: ir.col('ready_link_status_counts') },
					{ expr: ir.col('ready_gap_category_counts') },
					{ expr: ir.col('ready_gap_criticality_counts') },
					{ expr: ir.col('ready_gap_perspective_counts') }
				],
				limit: 1
			};
		}
	}
}
