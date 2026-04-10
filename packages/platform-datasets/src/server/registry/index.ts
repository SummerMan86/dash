/**
 * Dataset Registry — canonical owner of dataset metadata.
 *
 * Every dataset in the system has one entry here.
 * The registry owns: source descriptors, field catalogs, and compile references.
 * Providers consume entry-owned metadata instead of maintaining their own catalogs.
 *
 * Compile functions remain in per-family definition files (definitions/*.ts).
 * genericCompile() does not exist yet (BR-9).
 *
 * Canonical reference: docs/architecture_dashboard_bi_target.md §1
 */
import type { DatasetId, DatasetFieldType, SourceDescriptor, DatasetFieldDef } from '../../model';

// ---------------------------------------------------------------------------
// Registry entry (transitional shape for BR-3)
// ---------------------------------------------------------------------------

import type { ProviderEntry } from '../../model';

/**
 * Transitional registry entry for BR-3.
 *
 * Extends ProviderEntry (the provider-facing contract from model/ports.ts).
 * Uses a simplified shape without paramsSchema/compile generics.
 * Compile is still called via compileDataset() in executeDatasetQuery.
 *
 * @deprecated Will be replaced by DatasetRegistryEntry<TParams> after BR-8/BR-9
 * when datasets migrate to typed params and genericCompile absorbs the central switch.
 */
export type RegistryEntry = ProviderEntry;

// ---------------------------------------------------------------------------
// Helper: columns -> fields
// ---------------------------------------------------------------------------

function columnsToFields(
	columns: Record<string, DatasetFieldType>,
): DatasetFieldDef[] {
	return Object.entries(columns).map(([name, type]) => ({ name, type }));
}

// ---------------------------------------------------------------------------
// Wildberries datasets
// ---------------------------------------------------------------------------

const wildberriesEntries: RegistryEntry[] = [
	{
		datasetId: 'wildberries.fact_product_office_day',
		source: { kind: 'postgres', schema: 'mart_marketplace', table: 'fact_product_office_day' },
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
// EMIS datasets (mechanical extraction, no page migration)
// All four are published read-model views in the `mart` schema,
// intended for BI/read-side consumption. Not operational tables.
// ---------------------------------------------------------------------------

const emisEntries: RegistryEntry[] = [
	{
		datasetId: 'emis.news_flat',
		source: { kind: 'postgres', schema: 'mart', table: 'emis_news_flat' },
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
// ---------------------------------------------------------------------------

const strategyEntries: RegistryEntry[] = [
	{
		datasetId: 'strategy.entity_overview',
		source: { kind: 'postgres', schema: 'mart_strategy', table: 'slobi_entity_overview' },
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
		datasetId: 'strategy.scorecard_overview',
		source: { kind: 'postgres', schema: 'mart_strategy', table: 'slobi_scorecard_overview' },
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
// Payment / mock datasets
// ---------------------------------------------------------------------------

const paymentEntries: RegistryEntry[] = [
	{
		datasetId: 'payment.kpi',
		source: { kind: 'mock', fixtureId: 'payment.kpi' },
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
		fields: columnsToFields({
			date: 'date', status: 'string', trx_count: 'number', trx_amount: 'number',
			avg_ticket: 'number', rejected_count: 'number', rejected_share_pct: 'number',
		}),
	},
	{
		datasetId: 'payment.topClients',
		source: { kind: 'mock', fixtureId: 'payment.topClients' },
		fields: columnsToFields({
			role: 'string', client_name: 'string', client_account: 'string',
			trx_count: 'number', trx_amount: 'number', avg_ticket: 'number',
			rejected_count: 'number', rejected_share_pct: 'number',
		}),
	},
	{
		datasetId: 'payment.mccSummary',
		source: { kind: 'mock', fixtureId: 'payment.mccSummary' },
		fields: columnsToFields({
			mcc: 'string', mcc_name: 'string', trx_count: 'number', trx_amount: 'number',
			avg_ticket: 'number', rejected_count: 'number', rejected_share_pct: 'number',
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
]) {
	registry.set(entry.datasetId, entry);
}

/**
 * Look up a dataset registry entry by id.
 * Returns undefined if the dataset is not registered.
 */
export function getRegistryEntry(datasetId: DatasetId): RegistryEntry | undefined {
	return registry.get(datasetId);
}

/**
 * Check if a dataset id is registered.
 */
export function isRegisteredDataset(datasetId: string): boolean {
	return registry.has(datasetId);
}

/**
 * List all registered dataset ids.
 */
export function listRegisteredDatasets(): DatasetId[] {
	return [...registry.keys()];
}
