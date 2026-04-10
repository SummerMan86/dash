import { describe, it, expect, afterEach } from 'vitest';
import { getDatasetSchema } from './getDatasetSchema';
import { DatasetExecutionError } from './executeDatasetQuery';
import { getRegistryEntry } from './registry';

describe('getDatasetSchema', () => {
	it('returns schema for a known postgres dataset', () => {
		const schema = getDatasetSchema('wildberries.fact_product_office_day');
		expect(schema.datasetId).toBe('wildberries.fact_product_office_day');
		expect(schema.source.kind).toBe('postgres');
		expect(schema.fields.length).toBe(18);
		expect(schema.fields[0]).toHaveProperty('name');
		expect(schema.fields[0]).toHaveProperty('type');
	});

	it('returns schema for a mock dataset', () => {
		const schema = getDatasetSchema('payment.kpi');
		expect(schema.datasetId).toBe('payment.kpi');
		expect(schema.source.kind).toBe('mock');
		expect(schema.fields.length).toBeGreaterThan(0);
	});

	it('returns schema for all 14 registered datasets', () => {
		const ids = [
			'wildberries.fact_product_office_day', 'wildberries.fact_product_period',
			'emis.news_flat', 'emis.object_news_facts', 'emis.objects_dim', 'emis.ship_route_vessels',
			'strategy.entity_overview', 'strategy.scorecard_overview',
			'strategy.performance_detail', 'strategy.cascade_detail',
			'payment.kpi', 'payment.timeseriesDaily', 'payment.topClients', 'payment.mccSummary',
		];
		for (const id of ids) {
			const schema = getDatasetSchema(id);
			expect(schema.datasetId).toBe(id);
			expect(schema.fields.length).toBeGreaterThan(0);
		}
	});

	it('throws DATASET_NOT_FOUND for unknown dataset', () => {
		try {
			getDatasetSchema('unknown.dataset');
			expect.fail('should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(DatasetExecutionError);
			const err = e as DatasetExecutionError;
			expect(err.code).toBe('DATASET_NOT_FOUND');
			expect(err.retryable).toBe(false);
		}
	});

	it('suppresses hidden fields from schema response', () => {
		// Temporarily add a hidden field to a real registry entry
		const entry = getRegistryEntry('payment.kpi')!;
		const originalFields = [...entry.fields];
		entry.fields = [
			...originalFields,
			{ name: 'internal_code', type: 'string', hidden: true },
		];

		try {
			const schema = getDatasetSchema('payment.kpi');
			const names = schema.fields.map((f) => f.name);
			expect(names).not.toContain('internal_code');
			expect(schema.fields.length).toBe(originalFields.length); // hidden excluded
		} finally {
			entry.fields = originalFields; // restore
		}
	});

	it('includes filterable and sortable annotations when present', () => {
		const entry = getRegistryEntry('payment.kpi')!;
		const originalFields = [...entry.fields];
		entry.fields = [
			{ name: 'status', type: 'string', filterable: true, sortable: true },
			{ name: 'amount', type: 'number', sortable: true },
		];

		try {
			const schema = getDatasetSchema('payment.kpi');
			const statusField = schema.fields.find((f) => f.name === 'status')!;
			expect(statusField.filterable).toBe(true);
			expect(statusField.sortable).toBe(true);
			const amountField = schema.fields.find((f) => f.name === 'amount')!;
			expect(amountField.filterable).toBeUndefined();
			expect(amountField.sortable).toBe(true);
		} finally {
			entry.fields = originalFields;
		}
	});

	it('passes requestId through to error', () => {
		try {
			getDatasetSchema('unknown.dataset', 'req-123');
			expect.fail('should have thrown');
		} catch (e) {
			const err = e as DatasetExecutionError;
			expect(err.requestId).toBe('req-123');
		}
	});

	it('does not require query execution — synchronous, no provider call', () => {
		// Verify schema lookup works without any provider registration or async call
		const schema = getDatasetSchema('strategy.entity_overview');
		expect(schema.fields.length).toBeGreaterThan(0);
	});
});
