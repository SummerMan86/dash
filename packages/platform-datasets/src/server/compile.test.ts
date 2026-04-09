import { describe, it, expect } from 'vitest';
import { isKnownDatasetId, compileDataset } from './compile';
import type { DatasetQuery } from '../model';

const stubQuery: DatasetQuery = {
	contractVersion: 'v1'
};

describe('isKnownDatasetId', () => {
	it('recognizes a payment dataset', () => {
		expect(isKnownDatasetId('payment.kpi')).toBe(true);
	});

	it('recognizes a wildberries dataset', () => {
		expect(isKnownDatasetId('wildberries.fact_product_office_day')).toBe(true);
	});

	it('recognizes a product period dataset', () => {
		expect(isKnownDatasetId('wildberries.fact_product_period')).toBe(true);
	});

	it('recognizes an EMIS mart dataset', () => {
		expect(isKnownDatasetId('emis.news_flat')).toBe(true);
	});

	it('recognizes a strategy mart dataset', () => {
		expect(isKnownDatasetId('strategy.entity_overview')).toBe(true);
	});

	it('rejects an unknown dataset', () => {
		expect(isKnownDatasetId('unknown.dataset')).toBe(false);
	});

	it('rejects an empty string', () => {
		expect(isKnownDatasetId('')).toBe(false);
	});
});

describe('compileDataset', () => {
	it('routes payment dataset to payment compiler', () => {
		const ir = compileDataset('payment.kpi', stubQuery);
		expect(ir.kind).toBe('select');
		expect(ir.from).toEqual({ kind: 'dataset', id: 'payment.kpi' });
	});

	it('routes wildberries dataset to wildberries compiler', () => {
		const ir = compileDataset('wildberries.fact_product_office_day', stubQuery);
		expect(ir.kind).toBe('select');
		expect(ir.from).toEqual({ kind: 'dataset', id: 'wildberries.fact_product_office_day' });
	});

	it('routes product period dataset to product period compiler', () => {
		const ir = compileDataset('wildberries.fact_product_period', stubQuery);
		expect(ir.kind).toBe('select');
		expect(ir.from).toEqual({ kind: 'dataset', id: 'wildberries.fact_product_period' });
	});

	it('routes EMIS mart dataset to EMIS compiler', () => {
		const ir = compileDataset('emis.news_flat', stubQuery);
		expect(ir.kind).toBe('select');
		expect(ir.from).toEqual({ kind: 'dataset', id: 'emis.news_flat' });
	});

	it('routes strategy mart dataset to strategy compiler', () => {
		const ir = compileDataset('strategy.entity_overview', stubQuery);
		expect(ir.kind).toBe('select');
		expect(ir.from).toEqual({ kind: 'dataset', id: 'strategy.entity_overview' });
	});

	it('throws DATASET_NOT_FOUND for unknown dataset', () => {
		expect(() => compileDataset('unknown.dataset', stubQuery)).toThrowError(
			'Unknown datasetId: unknown.dataset'
		);

		try {
			compileDataset('unknown.dataset', stubQuery);
		} catch (e: unknown) {
			expect((e as { code: string }).code).toBe('DATASET_NOT_FOUND');
		}
	});
});
