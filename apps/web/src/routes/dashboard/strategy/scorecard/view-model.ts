/**
 * Scorecard page view-model — pure transformations from DatasetResponse rows.
 *
 * This is the reference view-model for the BI refactor target architecture.
 * Route-local: does not export to other pages or packages.
 *
 * Pattern: DatasetResponse.rows → typed ScorecardRow[] → aggregations/summaries.
 * Zod paramsSchema validation will be wired in BR-9 when registry entries
 * carry typed params and executeDatasetQuery invokes parse.
 */
import type { JsonValue } from '@dashboard-builder/platform-datasets';
import { asBoolean, asNumber, asString, type StrategyRow } from '../utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScorecardBadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'muted';

export type ScorecardRow = {
	departmentCode: string;
	departmentName: string;
	perspectiveCode: string;
	perspectiveName: string;
	horizonCode: string;
	horizonName: string;
	totalKpiCount: number;
	kpiWithTarget: number;
	kpiWithActual: number;
	gapCount: number;
	weightMissingFlag: boolean;
	missingWeightRows: number;
	planCoveragePct: number | null;
	actualCoveragePct: number | null;
	readinessLabel: string;
	readinessVariant: ScorecardBadgeVariant;
	attentionScore: number;
};

export type DepartmentSummary = {
	departmentCode: string;
	departmentName: string;
	rowsCount: number;
	totalKpiCount: number;
	kpiWithTarget: number;
	kpiWithActual: number;
	gapCount: number;
	rowsWithoutWeights: number;
	planCoveragePct: number | null;
	actualCoveragePct: number | null;
	attentionScore: number;
};

export type HorizonSummary = {
	horizonCode: string;
	horizonName: string;
	totalKpiCount: number;
	kpiWithTarget: number;
	kpiWithActual: number;
	gapCount: number;
	planCoveragePct: number | null;
	actualCoveragePct: number | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function toCoverage(numerator: number, denominator: number): number | null {
	if (!Number.isFinite(denominator) || denominator <= 0) return null;
	return (numerator / denominator) * 100;
}

export function getCoverageVariant(value: number | null): ScorecardBadgeVariant {
	if (value === null) return 'muted';
	if (value >= 80) return 'success';
	if (value >= 50) return 'warning';
	return 'error';
}

export function getCoverageBarClass(value: number | null, emphasize = false): string {
	if (value === null) return 'bg-muted-foreground/20';
	if (value >= 80) return emphasize ? 'bg-emerald-500' : 'bg-emerald-400';
	if (value >= 50) return emphasize ? 'bg-amber-500' : 'bg-amber-400';
	return emphasize ? 'bg-rose-500' : 'bg-rose-400';
}

export function clampBarWidth(value: number | null): string {
	if (value === null) return '0%';
	return `${Math.max(6, Math.min(100, value))}%`;
}

export function getReadiness(values: {
	totalKpiCount: number;
	kpiWithActual: number;
	planCoveragePct: number | null;
	actualCoveragePct: number | null;
	gapCount: number;
	weightMissingFlag: boolean;
}): { label: string; variant: ScorecardBadgeVariant; attentionScore: number } {
	const uncoveredActual = Math.max(0, values.totalKpiCount - values.kpiWithActual);
	const baseAttentionScore =
		(values.weightMissingFlag ? 140 : 0) +
		uncoveredActual * 6 +
		values.gapCount * 10 +
		(values.planCoveragePct === null ? 15 : Math.max(0, 75 - values.planCoveragePct));

	if (values.totalKpiCount === 0) {
		return { label: 'Нет KPI', variant: 'muted', attentionScore: 0 };
	}

	if (values.weightMissingFlag) {
		return { label: 'Нужно добрать веса', variant: 'warning', attentionScore: baseAttentionScore };
	}

	if ((values.actualCoveragePct ?? 0) >= 80 && values.gapCount === 0) {
		return { label: 'Можно показывать', variant: 'success', attentionScore: baseAttentionScore };
	}

	if ((values.actualCoveragePct ?? 0) >= 50 && (values.planCoveragePct ?? 0) >= 70) {
		return { label: 'Рабочий прогресс', variant: 'info', attentionScore: baseAttentionScore };
	}

	return { label: 'Зона внимания', variant: 'error', attentionScore: baseAttentionScore };
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

export function mapToScorecardRows(rawRows: Array<Record<string, JsonValue>>): ScorecardRow[] {
	return (rawRows as StrategyRow[]).map((row) => {
		const totalKpiCount = asNumber(row.total_kpi_count) ?? 0;
		const kpiWithTarget = asNumber(row.kpi_with_target) ?? 0;
		const kpiWithActual = asNumber(row.kpi_with_actual) ?? 0;
		const gapCount = asNumber(row.gap_count) ?? 0;
		const weightMissingFlag = asBoolean(row.weight_missing_flag) === true;
		const planCoveragePct = toCoverage(kpiWithTarget, totalKpiCount);
		const actualCoveragePct = toCoverage(kpiWithActual, totalKpiCount);
		const readiness = getReadiness({
			totalKpiCount,
			kpiWithActual,
			planCoveragePct,
			actualCoveragePct,
			gapCount,
			weightMissingFlag,
		});

		return {
			departmentCode: asString(row.department_code) ?? '—',
			departmentName: asString(row.department_name) ?? asString(row.department_code) ?? '—',
			perspectiveCode: asString(row.perspective_code) ?? '—',
			perspectiveName: asString(row.perspective_name) ?? asString(row.perspective_code) ?? '—',
			horizonCode: asString(row.horizon_code) ?? '—',
			horizonName: asString(row.horizon_name) ?? asString(row.horizon_code) ?? '—',
			totalKpiCount,
			kpiWithTarget,
			kpiWithActual,
			gapCount,
			weightMissingFlag,
			missingWeightRows: asNumber(row.missing_weight_rows) ?? 0,
			planCoveragePct,
			actualCoveragePct,
			readinessLabel: readiness.label,
			readinessVariant: readiness.variant,
			attentionScore: readiness.attentionScore,
		};
	});
}
