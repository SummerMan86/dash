/**
 * Condition Evaluator
 *
 * Evaluates alert conditions by generating SQL queries and executing them
 * against the dataset tables. Uses the same safe SQL building patterns
 * as postgresProvider.
 */

import { getPgPool } from '$lib/server/db/pg';
import type { AlertRule, AlertCondition, EvaluationResult } from '../model/types';

// ============================================================================
// Dataset to Table Mapping (mirrors postgresProvider)
// ============================================================================

type TableMapping = {
	schema: string;
	table: string;
};

const DATASET_TABLES: Record<string, TableMapping> = {
	'wildberries.fact_product_period': { schema: 'mart_marketplace', table: 'fact_product_period' },
	'wildberries.fact_product_office_day': {
		schema: 'mart_marketplace',
		table: 'fact_product_office_day'
	}
};

// ============================================================================
// SQL Builder Utilities (same pattern as postgresProvider)
// ============================================================================

function isSafeIdent(name: string): boolean {
	return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function qIdent(name: string): string {
	if (!isSafeIdent(name)) {
		throw new Error(`conditionEvaluator: unsafe identifier: ${name}`);
	}
	return `"${name}"`;
}

class SqlBuilder {
	values: unknown[] = [];

	addParam(value: unknown): string {
		this.values.push(value);
		return `$${this.values.length}`;
	}
}

// ============================================================================
// Date Reference Resolution
// ============================================================================

/**
 * Resolves relative date references to SQL expressions
 * - 'now' -> CURRENT_DATE
 * - '-7d' -> CURRENT_DATE - INTERVAL '7 days'
 * - '-1w' -> CURRENT_DATE - INTERVAL '1 weeks'
 * - '-1m' -> CURRENT_DATE - INTERVAL '1 months'
 */
function resolveDateRef(ref: string): string {
	if (ref === 'now') {
		return 'CURRENT_DATE';
	}

	const match = ref.match(/^-(\d+)([dwm])$/);
	if (!match) {
		throw new Error(`conditionEvaluator: invalid date reference: ${ref}`);
	}

	const [, num, unit] = match;
	const interval = unit === 'd' ? 'days' : unit === 'w' ? 'weeks' : 'months';
	return `CURRENT_DATE - INTERVAL '${num} ${interval}'`;
}

// ============================================================================
// Condition to SQL Conversion
// ============================================================================

function buildWhereCondition(condition: AlertCondition, builder: SqlBuilder): string {
	const { metric, operator, threshold } = condition;
	const col = qIdent(metric);
	const param = builder.addParam(threshold);

	// Simple comparison operators
	return `${col} ${operator} ${param}`;
}

function buildScopeFilters(
	scope: Record<string, unknown> | undefined,
	builder: SqlBuilder
): string[] {
	if (!scope) return [];

	const filters: string[] = [];
	for (const [col, value] of Object.entries(scope)) {
		const colIdent = qIdent(col);
		const param = builder.addParam(value);
		filters.push(`${colIdent} = ${param}`);
	}
	return filters;
}

function buildDateRangeFilters(dateRange: { from: string; to: string } | undefined): string[] {
	if (!dateRange) return [];

	const filters: string[] = [];
	const fromExpr = resolveDateRef(dateRange.from);
	const toExpr = resolveDateRef(dateRange.to);

	// Assume 'dt' is the date column (standard in our mart tables)
	filters.push(`"dt" >= ${fromExpr}`);
	filters.push(`"dt" <= ${toExpr}`);

	return filters;
}

// ============================================================================
// Main Evaluation Function
// ============================================================================

const MAX_MATCHED_ROWS = 100; // Limit for matched data to prevent huge payloads
const MAX_COUNT = 10000; // Upper limit for counting

export async function evaluateCondition(rule: AlertRule): Promise<EvaluationResult> {
	const { condition, datasetId } = rule;
	const tableInfo = DATASET_TABLES[datasetId];

	if (!tableInfo) {
		throw new Error(`conditionEvaluator: unknown dataset: ${datasetId}`);
	}

	const pool = getPgPool();
	const builder = new SqlBuilder();

	// Build table reference
	const tableName = `${qIdent(tableInfo.schema)}.${qIdent(tableInfo.table)}`;

	// Build WHERE clauses
	const whereParts: string[] = [];

	// Main condition (metric operator threshold)
	whereParts.push(buildWhereCondition(condition, builder));

	// Scope filters (e.g., seller_id, brand_name)
	whereParts.push(...buildScopeFilters(condition.scope, builder));

	// Date range filters
	whereParts.push(...buildDateRangeFilters(condition.dateRange));

	const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

	// First, get count
	const countSql = `SELECT COUNT(*) as cnt FROM ${tableName} ${whereClause}`;
	const countResult = await pool.query<{ cnt: string }>(countSql, builder.values);
	const matchedCount = Math.min(parseInt(countResult.rows[0]?.cnt ?? '0', 10), MAX_COUNT);

	if (matchedCount === 0) {
		return {
			triggered: false,
			matchedData: [],
			matchedCount: 0,
			checkedAt: new Date()
		};
	}

	// If triggered, get sample of matched data
	const dataSql = `SELECT * FROM ${tableName} ${whereClause} LIMIT ${MAX_MATCHED_ROWS}`;
	const dataResult = await pool.query(dataSql, builder.values);

	return {
		triggered: true,
		matchedData: dataResult.rows,
		matchedCount,
		checkedAt: new Date()
	};
}

// ============================================================================
// Dedup Key Generation
// ============================================================================

/**
 * Generates a deduplication key for an alert trigger.
 * This prevents sending the same alert multiple times on the same day
 * for the same condition.
 */
export function generateDedupKey(rule: AlertRule, matchedCount: number): string {
	// Simple hash based on rule condition and approximate match count bucket
	const countBucket = Math.floor(matchedCount / 10) * 10; // Round to nearest 10
	return `${rule.id}-${countBucket}`;
}
