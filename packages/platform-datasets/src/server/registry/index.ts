/**
 * Dataset Registry — canonical owner of dataset metadata.
 *
 * Every dataset in the system has one entry here.
 * The registry owns: source descriptors, field catalogs, paramsSchema, and compile.
 * Providers consume entry-owned metadata instead of maintaining their own catalogs.
 *
 * Datasets use one of two modes:
 * - Declarative: queryBindings + no compile → genericCompile() produces IR
 * - Custom compile: explicit compile function → custom IR
 *
 * Canonical reference: docs/architecture_dashboard_bi.md §1
 */
import { z } from 'zod';
import type { DatasetId, DatasetQuery, DatasetIr, DatasetFieldType } from '../../model';
import type { SourceDescriptor, DatasetFieldDef, DatasetFilterBinding } from '../../model';
import type { ProviderEntry } from '../../model';

// Import per-family compile functions (custom compile escape hatch)
import { compileWildberriesDataset } from '../definitions/wildberriesOfficeDay';
import { compileProductPeriodDataset } from '../definitions/wildberriesProductPeriod';
import { compileEmisMartDataset } from '../definitions/emisMart';
import { compileStrategyMartDataset } from '../definitions/strategyMart';
import { compileIftsDataset } from '../definitions/iftsMart';
import { compilePaymentDataset } from '../definitions/paymentAnalytics';

// ---------------------------------------------------------------------------
// Registry entry — canonical type with paramsSchema
// ---------------------------------------------------------------------------

/**
 * Full registry entry with Zod paramsSchema.
 *
 * Extends ProviderEntry (the provider-facing shape: datasetId, source, fields, cache, execution).
 * Adds paramsSchema for input validation and compile/queryBindings for IR generation.
 */
export type RegistryEntry = ProviderEntry & {
	/** Zod schema for params normalization. Applied in executeDatasetQuery step 3. */
	paramsSchema: z.ZodType<Record<string, unknown>>;
	/** Declarative param-to-field bindings for genericCompile. */
	queryBindings?: { filters?: DatasetFilterBinding[] };
	/**
	 * Custom compile function. If omitted, genericCompile() is used with queryBindings.
	 *
	 * Custom compile receives the raw DatasetQuery (not typedParams from paramsSchema.parse).
	 * Custom compile functions are responsible for their own param extraction from query.
	 * paramsSchema validation still runs before compile but its output is used only by genericCompile.
	 */
	compile?: (datasetId: DatasetId, query: DatasetQuery) => DatasetIr;
};

// ---------------------------------------------------------------------------
// Standard param schemas
// ---------------------------------------------------------------------------

/** Loose params schema for datasets with custom compile (compile does its own parsing). */
const looseParams = z.record(z.unknown());

/** Standard pagination + filter params for strategy datasets. */
const strategyParams = z.object({
	departmentCode: z.string().optional(),
	perspectiveCode: z.string().optional(),
	horizonCode: z.string().optional(),
	limit: z.coerce.number().int().positive().max(50_000).default(500),
}).passthrough();

// ---------------------------------------------------------------------------
// Helper: columns -> fields
// ---------------------------------------------------------------------------

function columnsToFields(
	columns: Record<string, DatasetFieldType>,
): DatasetFieldDef[] {
	return Object.entries(columns).map(([name, type]) => ({ name, type }));
}



// ---------------------------------------------------------------------------
// Wildberries datasets (custom compile)
// ---------------------------------------------------------------------------

const wildberriesEntries: RegistryEntry[] = [
	{
		datasetId: 'wildberries.fact_product_office_day',
		source: { kind: 'postgres', schema: 'mart_marketplace', table: 'fact_product_office_day' },
		paramsSchema: looseParams,
		compile: (id, q) => compileWildberriesDataset(id as never, q),
		fields: columnsToFields({
			seller_id: 'number', nm_id: 'number', chrt_id: 'number', office_id: 'number',
			dt: 'date', loaded_at: 'datetime', size_name: 'string', office_name: 'string',
			region_name: 'string', stock_count: 'number', stock_sum: 'number',
			buyout_count: 'number', buyout_sum: 'number', buyout_percent: 'number',
			sale_rate_days: 'number', avg_stock_turnover_days: 'number',
			to_client_count: 'number', from_client_count: 'number',
		}),
	},
	{
		datasetId: 'wildberries.fact_product_period',
		source: { kind: 'postgres', schema: 'mart_marketplace', table: 'fact_product_day' },
		paramsSchema: looseParams,
		compile: (id, q) => compileProductPeriodDataset(id as never, q),
		fields: columnsToFields({
			seller_id: 'number', nm_id: 'number', dt: 'date', loaded_at: 'datetime',
			title: 'string', vendor_code: 'string', brand_name: 'string',
			subject_id: 'number', subject_name: 'string', main_photo: 'string',
			stock_count: 'number', stock_sum: 'number', sale_rate_days: 'number',
			avg_stock_turnover_days: 'number', to_client_count: 'number',
			from_client_count: 'number', lost_orders_count: 'number', lost_orders_sum: 'number',
			lost_buyouts_count: 'number', lost_buyouts_sum: 'number',
			availability_status: 'string', price_min: 'number', price_max: 'number',
			open_count: 'number', cart_count: 'number', order_count: 'number', order_sum: 'number',
			buyout_count: 'number', buyout_sum: 'number', add_to_cart_percent: 'number',
			cart_to_order_percent: 'number', buyout_percent: 'number',
			add_to_wishlist_count: 'number', product_rating: 'number', feedback_rating: 'number',
			stocks_wb: 'number', stocks_mp: 'number',
		}),
	},
];

// ---------------------------------------------------------------------------
// EMIS datasets (custom compile, mechanical extraction)
// All four are published read-model views in the `mart` schema.
// ---------------------------------------------------------------------------

const emisEntries: RegistryEntry[] = [
	{
		datasetId: 'emis.news_flat',
		source: { kind: 'postgres', schema: 'mart', table: 'emis_news_flat' },
		paramsSchema: looseParams,
		compile: (id, q) => compileEmisMartDataset(id as never, q),
		fields: columnsToFields({
			id: 'string', title: 'string', summary: 'string', source_code: 'string',
			source_name: 'string', published_at: 'datetime', country_code: 'string',
			region: 'string', news_type: 'string', importance: 'number', is_manual: 'boolean',
			source_origin: 'string', has_geometry: 'boolean', related_objects_count: 'number',
		}),
	},
	{
		datasetId: 'emis.object_news_facts',
		source: { kind: 'postgres', schema: 'mart', table: 'emis_object_news_facts' },
		paramsSchema: looseParams,
		compile: (id, q) => compileEmisMartDataset(id as never, q),
		fields: columnsToFields({
			link_id: 'string', news_id: 'string', news_title: 'string', object_id: 'string',
			object_name: 'string', object_type_code: 'string', object_type_name: 'string',
			object_country_code: 'string', published_at: 'datetime', source_code: 'string',
			source_name: 'string', link_type: 'string', is_primary: 'boolean',
			confidence: 'number', news_source_origin: 'string', object_source_origin: 'string',
		}),
	},
	{
		datasetId: 'emis.objects_dim',
		source: { kind: 'postgres', schema: 'mart', table: 'emis_objects_dim' },
		paramsSchema: looseParams,
		compile: (id, q) => compileEmisMartDataset(id as never, q),
		fields: columnsToFields({
			id: 'string', external_id: 'string', name: 'string', name_en: 'string',
			object_type_code: 'string', object_type_name: 'string', country_code: 'string',
			country_name_ru: 'string', country_name_en: 'string', region: 'string',
			status: 'string', operator_name: 'string', source_origin: 'string',
			geometry_type: 'string', centroid_lon: 'number', centroid_lat: 'number',
			created_at: 'datetime', updated_at: 'datetime',
		}),
	},
	{
		datasetId: 'emis.ship_route_vessels',
		source: { kind: 'postgres', schema: 'mart', table: 'emis_ship_route_vessels' },
		paramsSchema: looseParams,
		compile: (id, q) => compileEmisMartDataset(id as never, q),
		fields: columnsToFields({
			ship_hbk_id: 'number', ship_id: 'number', imo: 'number', mmsi: 'number',
			vessel_name: 'string', vessel_type: 'string', flag: 'string', callsign: 'string',
			first_fetched_at: 'datetime', last_fetched_at: 'datetime',
			last_route_date_utc: 'date', points_count: 'number', route_days_count: 'number',
			last_latitude: 'number', last_longitude: 'number',
		}),
	},
];

// ---------------------------------------------------------------------------
// Strategy datasets
// strategy.scorecard_overview is DECLARATIVE (first genericCompile dataset)
// Others use custom compile
// ---------------------------------------------------------------------------

const strategyEntries: RegistryEntry[] = [
	{
		datasetId: 'strategy.entity_overview',
		source: { kind: 'postgres', schema: 'mart_strategy', table: 'slobi_entity_overview' },
		paramsSchema: strategyParams,
		compile: (id, q) => compileStrategyMartDataset(id as never, q),
		fields: columnsToFields({
			strategy_entity_id: 'string', source_run_id: 'string', entity_origin: 'string',
			entity_name: 'string', entity_semantics: 'string', binding_model: 'string',
			resolution_status: 'string', strategy_tactic_label: 'string', ksu_flag: 'string',
			active_flag: 'boolean', department_code: 'string', perspective_code: 'string',
			horizon_code: 'string', multi_perspective_flag: 'boolean',
			has_confirmed_evidence_flag: 'boolean', has_derived_only_flag: 'boolean',
			document_count: 'number', goal_count: 'number', task_count: 'number',
			kpi_count: 'number', candidate_metric_count: 'number', gap_count: 'number',
			total_kpi_count: 'number', kpi_with_target: 'number', kpi_with_actual: 'number',
			avg_achievement_pct: 'number', weighted_score: 'number', weight_pct: 'number',
			weight_missing_flag: 'boolean', coverage_items_total: 'number',
			weak_entity_flag: 'boolean', score_band: 'string',
		}),
	},
	{
		// DECLARATIVE MODE — first dataset using genericCompile via queryBindings
		datasetId: 'strategy.scorecard_overview',
		source: { kind: 'postgres', schema: 'mart_strategy', table: 'slobi_scorecard_overview' },
		paramsSchema: strategyParams,
		queryBindings: {
			filters: [
				{ param: 'departmentCode', field: 'department_code', op: 'eq' },
				{ param: 'perspectiveCode', field: 'perspective_code', op: 'eq' },
				{ param: 'horizonCode', field: 'horizon_code', op: 'eq' },
			],
		},
		// No compile — genericCompile() will be used
		fields: columnsToFields({
			department_code: 'string', department_name: 'string', department_order: 'number',
			perspective_code: 'string', perspective_name: 'string', perspective_order: 'number',
			horizon_code: 'string', horizon_name: 'string', horizon_order: 'number',
			total_kpi_count: 'number', kpi_with_target: 'number', kpi_with_actual: 'number',
			avg_achievement_pct: 'number', weighted_score: 'number', goal_count: 'number',
			task_count: 'number', gap_count: 'number', weight_pct: 'number',
			weight_missing_flag: 'boolean', weight_as_of_date: 'date',
			weighted_score_total: 'number', missing_weight_rows: 'number',
		}),
	},
	{
		datasetId: 'strategy.performance_detail',
		source: { kind: 'postgres', schema: 'mart_strategy', table: 'slobi_performance_detail' },
		paramsSchema: strategyParams,
		compile: (id, q) => compileStrategyMartDataset(id as never, q),
		fields: columnsToFields({
			performance_entity_key: 'string', source_run_id: 'string',
			strategy_entity_id: 'string', entity_name: 'string', entity_semantics: 'string',
			department_code: 'string', perspective_code: 'string', horizon_code: 'string',
			status_label: 'string', year_num: 'number', period_label: 'string',
			fact_id: 'string', doc_id: 'string', fact_id_count: 'number',
			entity_link_count: 'number', fact_name: 'string', fact_class: 'string',
			metric_code: 'string', unit: 'string', target_value: 'number',
			actual_value: 'number', forecast_value: 'number', threshold_value: 'number',
			achievement_pct: 'number', deviation_abs: 'number', has_target_flag: 'boolean',
			has_actual_flag: 'boolean', created_at: 'datetime',
		}),
	},
	{
		datasetId: 'strategy.cascade_detail',
		source: { kind: 'postgres', schema: 'mart_strategy', table: 'slobi_cascade_detail' },
		paramsSchema: strategyParams,
		compile: (id, q) => compileStrategyMartDataset(id as never, q),
		fields: columnsToFields({
			path_id: 'string', source_run_id: 'string', strategy_entity_id: 'string',
			entity_name: 'string', entity_semantics: 'string', department_code: 'string',
			perspective_code: 'string', horizon_code: 'string', cascade_group_key: 'string',
			completeness_status: 'string', path_status: 'string', cycle_flag: 'boolean',
			orphan_flag: 'boolean', doc_id: 'string', document_full_name: 'string',
			document_type: 'string', registry_matched_flag: 'boolean',
			root_fact_id: 'string', root_fact_name: 'string', task_fact_id: 'string',
			task_fact_name: 'string', kpi_fact_id: 'string', kpi_fact_name: 'string',
			leaf_fact_id: 'string', leaf_fact_name: 'string', path_depth: 'number',
			created_at: 'datetime',
		}),
	},
];

// ---------------------------------------------------------------------------
// Payment / mock datasets (custom compile)
// ---------------------------------------------------------------------------

const paymentEntries: RegistryEntry[] = [
	{
		datasetId: 'payment.kpi',
		source: { kind: 'mock', fixtureId: 'payment.kpi' },
		paramsSchema: looseParams,
		compile: (id, q) => compilePaymentDataset(id as never, q),
		fields: columnsToFields({
			period_label: 'string', date_from: 'date', date_to: 'date',
			total_amount: 'number', total_count: 'number', avg_ticket: 'number',
			rejected_count: 'number', rejected_share_pct: 'number',
			active_clients_count: 'number', avg_proc_time_sec: 'number',
		}),
	},
	{
		datasetId: 'payment.timeseriesDaily',
		source: { kind: 'mock', fixtureId: 'payment.timeseriesDaily' },
		paramsSchema: looseParams,
		compile: (id, q) => compilePaymentDataset(id as never, q),
		fields: columnsToFields({
			date: 'date', status: 'string', trx_count: 'number', trx_amount: 'number',
			avg_ticket: 'number', rejected_count: 'number', rejected_share_pct: 'number',
		}),
	},
	{
		datasetId: 'payment.topClients',
		source: { kind: 'mock', fixtureId: 'payment.topClients' },
		paramsSchema: looseParams,
		compile: (id, q) => compilePaymentDataset(id as never, q),
		fields: columnsToFields({
			role: 'string', client_name: 'string', client_account: 'string',
			trx_count: 'number', trx_amount: 'number', avg_ticket: 'number',
			rejected_count: 'number', rejected_share_pct: 'number',
		}),
	},
	{
		datasetId: 'payment.mccSummary',
		source: { kind: 'mock', fixtureId: 'payment.mccSummary' },
		paramsSchema: looseParams,
		compile: (id, q) => compilePaymentDataset(id as never, q),
		fields: columnsToFields({
			mcc: 'string', mcc_name: 'string', trx_count: 'number', trx_amount: 'number',
			avg_ticket: 'number', rejected_count: 'number', rejected_share_pct: 'number',
		}),
	},
];

// ---------------------------------------------------------------------------
// IFTS datasets (Oracle-backed, custom compile)
// ---------------------------------------------------------------------------

const iftsEntries: RegistryEntry[] = [
	{
		datasetId: 'ifts.system_parameters',
		source: { kind: 'oracle', connectionName: 'ifts', schema: 'ACH', table: 'SYSTEM_PARAMETERS' },
		paramsSchema: looseParams,
		compile: (id, q) => compileIftsDataset(id as never, q),
		fields: columnsToFields({
			OPERDAY: 'date', SESSION_ID: 'string', SERVICE: 'string',
			PROJECT_CODE: 'string', SYS_NAME: 'string',
			QUEUE_SIZE: 'number', QUEUE_AMOUNT: 'number',
			MAX_QUEUE_SIZE: 'number', MAX_QUEUE_AMOUNT: 'number',
		}),
	},
	{
		datasetId: 'ifts.payment_stats',
		source: { kind: 'oracle', connectionName: 'ifts', schema: 'ACH', table: 'T_PAYM_STAT' },
		paramsSchema: looseParams,
		compile: (id, q) => compileIftsDataset(id as never, q),
		cache: { ttlMs: 15_000 },
		execution: { timeoutMs: 5_000 },
		fields: columnsToFields({
			PAYM_STAT_ID: 'number', OPERDAY_ID: 'number', COLLECT_TIME: 'datetime',
			SERVICE: 'string', PAYM_PROCESSED_TOTAL: 'number',
			PAYM_PROCESSED_PERIOD: 'number', PAYM_QUEUED_IN_PERIOD: 'number',
			PAYM_QUEUED_OUT_PERIOD: 'number', PAYM_QUEUED_CURRENT: 'number',
			PAYM_REJECTED_TOTAL: 'number', PAYM_REJECTED_PERIOD: 'number',
		}),
	},
	{
		datasetId: 'ifts.message_stats',
		source: { kind: 'oracle', connectionName: 'ifts', schema: 'ACH', table: 'T_MSGS_STAT' },
		paramsSchema: looseParams,
		compile: (id, q) => compileIftsDataset(id as never, q),
		cache: { ttlMs: 15_000 },
		execution: { timeoutMs: 5_000 },
		fields: columnsToFields({
			MSGS_STAT_ID: 'number', OPERDAY_ID: 'number', COLLECT_TIME: 'datetime',
			IM_PROCESSED_TOTAL: 'number', IM_PROCESSED_TIME_AVG: 'number',
			IM_PROCESSED_PERIOD: 'number', IM_REJECTED_TOTAL: 'number',
			IM_REJECTED_PERIOD: 'number', OM_PROCESSED_TOTAL: 'number',
			OM_PROCESSED_TOTAL_TIME_AVG: 'number', OM_PROCESSED_PERIOD: 'number',
			OM_REJECTED_TOTAL: 'number', OM_REJECTED_PERIOD: 'number',
		}),
	},
	{
		datasetId: 'ifts.operday_state',
		source: { kind: 'oracle', connectionName: 'ifts', schema: 'ACH', table: 'OPERDAY_STATE' },
		paramsSchema: looseParams,
		compile: (id, q) => compileIftsDataset(id as never, q),
		fields: columnsToFields({
			OPERDAY_STATE_ID: 'number', OPERDAY_ID: 'number', STATE_ID: 'number',
			STATUS: 'string', START_TIME: 'datetime', FINISH_TIME: 'datetime',
		}),
	},
];

// ---------------------------------------------------------------------------
// Registry assembly
// ---------------------------------------------------------------------------

const registry = new Map<DatasetId, RegistryEntry>();

for (const entry of [
	...wildberriesEntries,
	...emisEntries,
	...strategyEntries,
	...paymentEntries,
	...iftsEntries,
]) {
	registry.set(entry.datasetId, entry);
}

export function getRegistryEntry(datasetId: DatasetId): RegistryEntry | undefined {
	return registry.get(datasetId);
}

export function isRegisteredDataset(datasetId: string): boolean {
	return registry.has(datasetId);
}

export function listRegisteredDatasets(): DatasetId[] {
	return [...registry.keys()];
}
