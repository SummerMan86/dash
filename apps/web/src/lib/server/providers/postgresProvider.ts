import type { DatasetField, DatasetResponse, JsonValue } from '$entities/dataset';
import type { DatasetIr, IrExpr, IrOrderBy, IrSelectItem } from '$entities/dataset';
import type { Provider, ServerContext } from '$entities/dataset';
import { CONTRACT_VERSION } from '$entities/dataset';

import pg from 'pg';
import { getPgPool } from '$lib/server/db/pg';

// pg returns bigint (OID 20) and numeric (OID 1700) as strings by default to avoid precision loss.
// Our dashboard metrics fit safely in JS number (< 2^53), so parse them as float.
pg.types.setTypeParser(20, (val: string) => parseFloat(val));
pg.types.setTypeParser(1700, (val: string) => parseFloat(val));

type ColumnType = DatasetField['type'];

type DatasetSqlMapping = {
	relation: { schema: string; table: string };
	columns: Record<string, ColumnType>;
	extraFields?: DatasetField[];
	postProcessRows?: (rows: Array<Record<string, JsonValue>>) => Array<Record<string, JsonValue>>;
};

const DATASETS: Record<string, DatasetSqlMapping> = {
	'wildberries.fact_product_office_day': {
		relation: { schema: 'mart_marketplace', table: 'fact_product_office_day' },
		columns: {
			seller_id: 'number',
			nm_id: 'number',
			chrt_id: 'number',
			office_id: 'number',
			dt: 'date',
			loaded_at: 'datetime',
			size_name: 'string',
			office_name: 'string',
			region_name: 'string',
			stock_count: 'number',
			stock_sum: 'number',
			buyout_count: 'number',
			buyout_sum: 'number',
			buyout_percent: 'number',
			sale_rate_days: 'number',
			avg_stock_turnover_days: 'number',
			to_client_count: 'number',
			from_client_count: 'number'
		}
	},
	'wildberries.fact_product_period': {
		relation: { schema: 'mart_marketplace', table: 'fact_product_day' },
		columns: {
			seller_id: 'number',
			nm_id: 'number',
			dt: 'date',
			loaded_at: 'datetime',
			title: 'string',
			vendor_code: 'string',
			brand_name: 'string',
			subject_id: 'number',
			subject_name: 'string',
			main_photo: 'string',
			stock_count: 'number',
			stock_sum: 'number',
			sale_rate_days: 'number',
			avg_stock_turnover_days: 'number',
			to_client_count: 'number',
			from_client_count: 'number',
			lost_orders_count: 'number',
			lost_orders_sum: 'number',
			lost_buyouts_count: 'number',
			lost_buyouts_sum: 'number',
			availability_status: 'string',
			price_min: 'number',
			price_max: 'number',
			open_count: 'number',
			cart_count: 'number',
			order_count: 'number',
			order_sum: 'number',
			buyout_count: 'number',
			buyout_sum: 'number',
			add_to_cart_percent: 'number',
			cart_to_order_percent: 'number',
			buyout_percent: 'number',
			add_to_wishlist_count: 'number',
			product_rating: 'number',
			feedback_rating: 'number',
			stocks_wb: 'number',
			stocks_mp: 'number'
		}
	},
	'emis.news_flat': {
		relation: { schema: 'mart', table: 'emis_news_flat' },
		columns: {
			id: 'string',
			title: 'string',
			summary: 'string',
			source_code: 'string',
			source_name: 'string',
			published_at: 'datetime',
			country_code: 'string',
			region: 'string',
			news_type: 'string',
			importance: 'number',
			is_manual: 'boolean',
			source_origin: 'string',
			has_geometry: 'boolean',
			related_objects_count: 'number'
		}
	},
	'emis.object_news_facts': {
		relation: { schema: 'mart', table: 'emis_object_news_facts' },
		columns: {
			link_id: 'string',
			news_id: 'string',
			news_title: 'string',
			object_id: 'string',
			object_name: 'string',
			object_type_code: 'string',
			object_type_name: 'string',
			object_country_code: 'string',
			published_at: 'datetime',
			source_code: 'string',
			source_name: 'string',
			link_type: 'string',
			is_primary: 'boolean',
			confidence: 'number',
			news_source_origin: 'string',
			object_source_origin: 'string'
		}
	},
	'emis.objects_dim': {
		relation: { schema: 'mart', table: 'emis_objects_dim' },
		columns: {
			id: 'string',
			external_id: 'string',
			name: 'string',
			name_en: 'string',
			object_type_code: 'string',
			object_type_name: 'string',
			country_code: 'string',
			country_name_ru: 'string',
			country_name_en: 'string',
			region: 'string',
			status: 'string',
			operator_name: 'string',
			source_origin: 'string',
			geometry_type: 'string',
			centroid_lon: 'number',
			centroid_lat: 'number',
			created_at: 'datetime',
			updated_at: 'datetime'
		}
	},
	'emis.ship_route_vessels': {
		relation: { schema: 'mart', table: 'emis_ship_route_vessels' },
		columns: {
			ship_hbk_id: 'number',
			ship_id: 'number',
			imo: 'number',
			mmsi: 'number',
			vessel_name: 'string',
			vessel_type: 'string',
			flag: 'string',
			callsign: 'string',
			first_fetched_at: 'datetime',
			last_fetched_at: 'datetime',
			last_route_date_utc: 'date',
			points_count: 'number',
			route_days_count: 'number',
			last_latitude: 'number',
			last_longitude: 'number'
		}
	},
	'strategy.entity_overview': {
		relation: { schema: 'mart_strategy', table: 'slobi_entity_overview' },
		columns: {
			strategy_entity_id: 'string',
			source_run_id: 'string',
			entity_origin: 'string',
			entity_name: 'string',
			entity_semantics: 'string',
			binding_model: 'string',
			resolution_status: 'string',
			strategy_tactic_label: 'string',
			ksu_flag: 'string',
			active_flag: 'boolean',
			department_code: 'string',
			perspective_code: 'string',
			horizon_code: 'string',
			multi_perspective_flag: 'boolean',
			has_confirmed_evidence_flag: 'boolean',
			has_derived_only_flag: 'boolean',
			document_count: 'number',
			goal_count: 'number',
			task_count: 'number',
			kpi_count: 'number',
			candidate_metric_count: 'number',
			gap_count: 'number',
			total_kpi_count: 'number',
			kpi_with_target: 'number',
			kpi_with_actual: 'number',
			avg_achievement_pct: 'number',
			weighted_score: 'number',
			weight_pct: 'number',
			weight_missing_flag: 'boolean',
			coverage_items_total: 'number',
			weak_entity_flag: 'boolean',
			score_band: 'string'
		}
	},
	'strategy.scorecard_overview': {
		relation: { schema: 'mart_strategy', table: 'slobi_scorecard_overview' },
		columns: {
			department_code: 'string',
			department_name: 'string',
			department_order: 'number',
			perspective_code: 'string',
			perspective_name: 'string',
			perspective_order: 'number',
			horizon_code: 'string',
			horizon_name: 'string',
			horizon_order: 'number',
			total_kpi_count: 'number',
			kpi_with_target: 'number',
			kpi_with_actual: 'number',
			avg_achievement_pct: 'number',
			weighted_score: 'number',
			goal_count: 'number',
			task_count: 'number',
			gap_count: 'number',
			weight_pct: 'number',
			weight_missing_flag: 'boolean',
			weight_as_of_date: 'date',
			weighted_score_total: 'number',
			missing_weight_rows: 'number'
		}
	},
	'strategy.performance_detail': {
		relation: { schema: 'mart_strategy', table: 'slobi_performance_detail' },
		columns: {
			performance_entity_key: 'string',
			source_run_id: 'string',
			strategy_entity_id: 'string',
			entity_name: 'string',
			entity_semantics: 'string',
			department_code: 'string',
			perspective_code: 'string',
			horizon_code: 'string',
			status_label: 'string',
			year_num: 'number',
			period_label: 'string',
			fact_id: 'string',
			doc_id: 'string',
			fact_id_count: 'number',
			entity_link_count: 'number',
			fact_name: 'string',
			fact_class: 'string',
			metric_code: 'string',
			unit: 'string',
			target_value: 'number',
			actual_value: 'number',
			forecast_value: 'number',
			threshold_value: 'number',
			achievement_pct: 'number',
			deviation_abs: 'number',
			has_target_flag: 'boolean',
			has_actual_flag: 'boolean',
			created_at: 'datetime'
		}
	},
	'strategy.cascade_detail': {
		relation: { schema: 'mart_strategy', table: 'slobi_cascade_detail' },
		columns: {
			path_id: 'string',
			source_run_id: 'string',
			strategy_entity_id: 'string',
			entity_name: 'string',
			entity_semantics: 'string',
			department_code: 'string',
			perspective_code: 'string',
			horizon_code: 'string',
			cascade_group_key: 'string',
			completeness_status: 'string',
			path_status: 'string',
			cycle_flag: 'boolean',
			orphan_flag: 'boolean',
			doc_id: 'string',
			document_full_name: 'string',
			document_type: 'string',
			registry_matched_flag: 'boolean',
			root_fact_id: 'string',
			root_fact_name: 'string',
			task_fact_id: 'string',
			task_fact_name: 'string',
			kpi_fact_id: 'string',
			kpi_fact_name: 'string',
			leaf_fact_id: 'string',
			leaf_fact_name: 'string',
			path_depth: 'number',
			created_at: 'datetime'
		}
	}
};

function isSafeIdent(name: string): boolean {
	// Conservative SQL identifier rule: letters/underscore, then letters/numbers/underscore.
	// We use this for schema/table/column/alias names.
	return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
}

function qIdent(name: string): string {
	if (!isSafeIdent(name)) throw new Error(`postgresProvider: unsafe identifier: ${name}`);
	return `"${name}"`;
}

function colTypeFor(mapping: DatasetSqlMapping, colName: string): ColumnType {
	const t = mapping.columns[colName];
	if (!t) throw new Error(`postgresProvider: unknown column "${colName}" for dataset`);
	return t;
}

class SqlBuilder {
	values: unknown[] = [];
	addParam(value: unknown): string {
		this.values.push(value);
		return `$${this.values.length}`;
	}
}

function castParam(param: string, colType: ColumnType): string {
	// Only cast where it matters for Postgres operators.
	switch (colType) {
		case 'date':
			return `${param}::date`;
		case 'datetime':
			return `${param}::timestamptz`;
		default:
			return param;
	}
}

function exprToSql(expr: IrExpr, b: SqlBuilder, mapping: DatasetSqlMapping): string {
	switch (expr.kind) {
		case 'col': {
			if (!mapping.columns[expr.name])
				throw new Error(`postgresProvider: unknown column "${expr.name}"`);
			return qIdent(expr.name);
		}
		case 'lit': {
			// Values are always parameterized.
			return b.addParam(expr.value);
		}
		case 'and': {
			if (!expr.items.length) return 'TRUE';
			return `(${expr.items.map((it) => exprToSql(it, b, mapping)).join(' AND ')})`;
		}
		case 'or': {
			if (!expr.items.length) return 'FALSE';
			return `(${expr.items.map((it) => exprToSql(it, b, mapping)).join(' OR ')})`;
		}
		case 'not': {
			return `(NOT ${exprToSql(expr.item, b, mapping)})`;
		}
		case 'bin': {
			// Special handling for comparisons so we can cast params based on column type.
			if (expr.left.kind === 'col' && expr.right.kind === 'lit') {
				const t = colTypeFor(mapping, expr.left.name);
				const left = exprToSql(expr.left, b, mapping);
				const rawParam = b.addParam(expr.right.value);
				const right = castParam(rawParam, t);
				if (expr.op === 'in') {
					// MVP: allow `col IN (array)` via `= ANY($n)` if caller passed an array literal.
					// Note: IR type doesn't declare arrays, but we accept them at runtime for flexibility.
					if (!Array.isArray(expr.right.value as unknown)) {
						throw new Error(`postgresProvider: IN requires array literal on the right side`);
					}
					return `(${left} = ANY(${rawParam}))`;
				}
				return `(${left} ${expr.op} ${right})`;
			}

			if (expr.op === 'in') {
				// We only support `col IN (arrayLiteral)` in MVP.
				throw new Error(`postgresProvider: IN is only supported as col IN (arrayLiteral)`);
			}

			const left = exprToSql(expr.left, b, mapping);
			const right = exprToSql(expr.right, b, mapping);
			return `(${left} ${expr.op} ${right})`;
		}
		case 'call': {
			// MVP: keep providers simple; definitions for MVP should avoid aggregations.
			throw new Error(`postgresProvider: call() not supported in MVP (${expr.name})`);
		}
	}
}

function selectItemSql(
	item: IrSelectItem,
	b: SqlBuilder,
	mapping: DatasetSqlMapping
): { sql: string; name?: string } {
	// MVP restriction: select items should be simple columns (optional alias).
	if (item.expr.kind !== 'col')
		throw new Error(`postgresProvider: only column select items supported in MVP`);

	const colName = item.expr.name;
	if (!mapping.columns[colName]) throw new Error(`postgresProvider: unknown column "${colName}"`);

	const base = qIdent(colName);
	const as = item.as ? qIdent(item.as) : undefined;
	return { sql: as ? `${base} AS ${as}` : base, name: item.as ?? colName };
}

function orderBySql(
	orderBy: IrOrderBy[] | undefined,
	b: SqlBuilder,
	mapping: DatasetSqlMapping
): string {
	if (!orderBy?.length) return '';
	const parts = orderBy.map((rule) => {
		if (rule.expr.kind !== 'col')
			throw new Error(`postgresProvider: ORDER BY supports only columns in MVP`);
		if (!mapping.columns[rule.expr.name])
			throw new Error(`postgresProvider: unknown ORDER BY column "${rule.expr.name}"`);
		return `${qIdent(rule.expr.name)} ${rule.dir.toUpperCase()}`;
	});
	return ` ORDER BY ${parts.join(', ')}`;
}

function inferFields(
	mapping: DatasetSqlMapping,
	items: Array<{ outputName: string; sourceCol: string }>
): DatasetField[] {
	const fields = items.map(({ outputName, sourceCol }) => ({
		name: outputName,
		type: mapping.columns[sourceCol] ?? 'unknown'
	}));

	if (!mapping.extraFields?.length) return fields;

	const knownNames = new Set(fields.map((field) => field.name));
	for (const field of mapping.extraFields) {
		if (knownNames.has(field.name)) continue;
		fields.push(field);
	}

	return fields;
}

function serializeOrderBy(orderBy: IrOrderBy[] | undefined) {
	if (!orderBy?.length) return undefined;

	return orderBy.flatMap((rule) =>
		rule.expr.kind === 'col' ? [{ field: rule.expr.name, dir: rule.dir }] : []
	);
}

export const postgresProvider: Provider = {
	async execute(irQuery: DatasetIr, ctx: ServerContext): Promise<DatasetResponse> {
		if (irQuery.kind !== 'select') throw new Error(`postgresProvider: unsupported IR kind`);
		if (irQuery.from.kind !== 'dataset') throw new Error(`postgresProvider: unsupported source`);

		const datasetId = irQuery.from.id;
		const mapping = DATASETS[datasetId];
		if (!mapping) throw new Error(`postgresProvider: no SQL mapping for datasetId "${datasetId}"`);

		if (irQuery.groupBy?.length) throw new Error(`postgresProvider: groupBy not supported in MVP`);

		const b = new SqlBuilder();

		const rel = `${qIdent(mapping.relation.schema)}.${qIdent(mapping.relation.table)}`;
		const selectParts: string[] = [];
		const selectedFields: Array<{ outputName: string; sourceCol: string }> = [];
		for (const item of irQuery.select) {
			const { sql, name } = selectItemSql(item, b, mapping);
			selectParts.push(sql);
			if (item.expr.kind === 'col' && name) {
				selectedFields.push({ outputName: name, sourceCol: item.expr.name });
			}
		}
		if (!selectParts.length) throw new Error(`postgresProvider: empty select list`);

		const whereSql = irQuery.where ? ` WHERE ${exprToSql(irQuery.where, b, mapping)}` : '';
		const orderBy = orderBySql(irQuery.orderBy, b, mapping);

		let limitSql = '';
		if (typeof irQuery.limit === 'number') {
			const limit = Math.max(0, Math.min(50_000, Math.floor(irQuery.limit)));
			const p = b.addParam(limit);
			limitSql = ` LIMIT ${p}`;
		}

		const text = `SELECT ${selectParts.join(', ')} FROM ${rel}${whereSql}${orderBy}${limitSql}`;

		const pool = getPgPool();
		const res = await pool.query(text, b.values);

		// pg returns `unknown` values. DatasetResponse requires JsonValue, so we pass through
		// primitives and JSON-serializable values as-is (SvelteKit will JSON.stringify).
		const rawRows = res.rows as Array<Record<string, JsonValue>>;
		const rows = mapping.postProcessRows ? mapping.postProcessRows(rawRows) : rawRows;

		return {
			contractVersion: CONTRACT_VERSION,
			datasetId,
			fields: inferFields(mapping, selectedFields),
			rows,
			meta: {
				executedAt: new Date().toISOString(),
				tenantId: ctx.tenantId,
				source: 'postgres',
				limit: typeof irQuery.limit === 'number' ? irQuery.limit : undefined,
				sort: serializeOrderBy(irQuery.orderBy)
			}
		};
	}
};
