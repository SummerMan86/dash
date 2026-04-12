import { describe, it, expect } from 'vitest';
import { paymentDateRangeParams, paymentNoParams, getRegistryEntry } from './index';

describe('paymentNoParams schema', () => {
	it('accepts empty object', () => {
		const result = paymentNoParams.parse({});
		expect(result).toEqual({});
	});

	it('strips unknown keys', () => {
		const result = paymentNoParams.parse({ foo: 'bar', baz: 123 });
		expect(result).toEqual({});
	});
});

describe('paymentDateRangeParams schema', () => {
	it('accepts empty object (both dates optional)', () => {
		const result = paymentDateRangeParams.parse({});
		expect(result).toEqual({});
	});

	it('accepts dateFrom only', () => {
		const result = paymentDateRangeParams.parse({ dateFrom: '2025-01-01' });
		expect(result).toEqual({ dateFrom: '2025-01-01' });
	});

	it('accepts dateTo only', () => {
		const result = paymentDateRangeParams.parse({ dateTo: '2025-12-31' });
		expect(result).toEqual({ dateTo: '2025-12-31' });
	});

	it('accepts both dateFrom and dateTo', () => {
		const result = paymentDateRangeParams.parse({
			dateFrom: '2025-01-01',
			dateTo: '2025-12-31',
		});
		expect(result).toEqual({ dateFrom: '2025-01-01', dateTo: '2025-12-31' });
	});

	it('strips unknown keys', () => {
		const result = paymentDateRangeParams.parse({
			dateFrom: '2025-01-01',
			unknownParam: 42,
		});
		expect(result).toEqual({ dateFrom: '2025-01-01' });
	});

	it('rejects non-string dateFrom', () => {
		expect(() => paymentDateRangeParams.parse({ dateFrom: 123 })).toThrow();
	});

	it('rejects non-string dateTo', () => {
		expect(() => paymentDateRangeParams.parse({ dateTo: true })).toThrow();
	});
});

describe('payment registry entries use explicit schemas', () => {
	it('payment.kpi uses paymentNoParams (rejects unknown keys)', () => {
		const entry = getRegistryEntry('payment.kpi');
		expect(entry).toBeDefined();
		const result = entry!.paramsSchema.parse({ unknownKey: 'value' });
		expect(result).toEqual({});
	});

	it('payment.timeseriesDaily uses paymentDateRangeParams', () => {
		const entry = getRegistryEntry('payment.timeseriesDaily');
		expect(entry).toBeDefined();
		const result = entry!.paramsSchema.parse({
			dateFrom: '2025-01-01',
			dateTo: '2025-06-30',
		});
		expect(result).toEqual({ dateFrom: '2025-01-01', dateTo: '2025-06-30' });
	});

	it('payment.timeseriesDaily rejects non-string dateFrom', () => {
		const entry = getRegistryEntry('payment.timeseriesDaily');
		expect(entry).toBeDefined();
		expect(() => entry!.paramsSchema.parse({ dateFrom: 42 })).toThrow();
	});

	it('payment.topClients uses paymentNoParams (rejects unknown keys)', () => {
		const entry = getRegistryEntry('payment.topClients');
		expect(entry).toBeDefined();
		const result = entry!.paramsSchema.parse({ someJunk: true });
		expect(result).toEqual({});
	});

	it('payment.mccSummary uses paymentNoParams (rejects unknown keys)', () => {
		const entry = getRegistryEntry('payment.mccSummary');
		expect(entry).toBeDefined();
		const result = entry!.paramsSchema.parse({ whatever: [1, 2, 3] });
		expect(result).toEqual({});
	});
});
