import { describe, it, expect } from 'vitest';
import { wbOfficeDayParams, wbProductPeriodParams } from './index';

// ---------------------------------------------------------------------------
// wbOfficeDayParams (wildberries.fact_product_office_day)
// ---------------------------------------------------------------------------

describe('wbOfficeDayParams', () => {
	it('accepts empty params and applies limit default', () => {
		const result = wbOfficeDayParams.parse({});
		expect(result.limit).toBe(500);
	});

	it('accepts all known params', () => {
		const input = {
			dateFrom: '2025-01-01',
			dateTo: '2025-01-31',
			nmId: 12345,
			officeId: 42,
			chrtId: 99,
			regionName: 'Moscow',
			limit: 100,
		};
		const result = wbOfficeDayParams.parse(input);
		expect(result).toMatchObject(input);
	});

	it('coerces string nmId to number', () => {
		const result = wbOfficeDayParams.parse({ nmId: '12345' });
		expect(result.nmId).toBe(12345);
		expect(typeof result.nmId).toBe('number');
	});

	it('coerces string officeId to number', () => {
		const result = wbOfficeDayParams.parse({ officeId: '42' });
		expect(result.officeId).toBe(42);
	});

	it('coerces string chrtId to number', () => {
		const result = wbOfficeDayParams.parse({ chrtId: '99' });
		expect(result.chrtId).toBe(99);
	});

	it('coerces string limit to number', () => {
		const result = wbOfficeDayParams.parse({ limit: '200' });
		expect(result.limit).toBe(200);
	});

	it('rejects non-integer nmId', () => {
		expect(() => wbOfficeDayParams.parse({ nmId: 1.5 })).toThrow();
	});

	it('rejects limit exceeding max', () => {
		expect(() => wbOfficeDayParams.parse({ limit: 60_000 })).toThrow();
	});

	it('rejects negative limit', () => {
		expect(() => wbOfficeDayParams.parse({ limit: -1 })).toThrow();
	});

	it('rejects non-string dateFrom', () => {
		expect(() => wbOfficeDayParams.parse({ dateFrom: 12345 })).toThrow();
	});

	it('rejects non-string regionName', () => {
		expect(() => wbOfficeDayParams.parse({ regionName: 123 })).toThrow();
	});

	it('passes through unknown keys (passthrough)', () => {
		const result = wbOfficeDayParams.parse({ extraKey: 'value' });
		expect(result.extraKey).toBe('value');
	});
});

// ---------------------------------------------------------------------------
// wbProductPeriodParams (wildberries.fact_product_period)
// ---------------------------------------------------------------------------

describe('wbProductPeriodParams', () => {
	it('accepts empty params and applies limit default', () => {
		const result = wbProductPeriodParams.parse({});
		expect(result.limit).toBe(1000);
	});

	it('accepts all known params', () => {
		const input = {
			dateFrom: '2025-01-01',
			dateTo: '2025-01-31',
			nmId: 12345,
			brandName: 'TestBrand',
			brand_name: 'TestBrandAlt',
			subjectName: 'Shoes',
			subject_name: 'ShoesAlt',
			limit: 200,
		};
		const result = wbProductPeriodParams.parse(input);
		expect(result).toMatchObject(input);
	});

	it('coerces string nmId to number', () => {
		const result = wbProductPeriodParams.parse({ nmId: '67890' });
		expect(result.nmId).toBe(67890);
		expect(typeof result.nmId).toBe('number');
	});

	it('coerces string limit to number', () => {
		const result = wbProductPeriodParams.parse({ limit: '300' });
		expect(result.limit).toBe(300);
	});

	it('rejects non-integer nmId', () => {
		expect(() => wbProductPeriodParams.parse({ nmId: 1.5 })).toThrow();
	});

	it('rejects limit exceeding max', () => {
		expect(() => wbProductPeriodParams.parse({ limit: 60_000 })).toThrow();
	});

	it('rejects negative limit', () => {
		expect(() => wbProductPeriodParams.parse({ limit: -1 })).toThrow();
	});

	it('rejects non-string brandName', () => {
		expect(() => wbProductPeriodParams.parse({ brandName: 123 })).toThrow();
	});

	it('rejects non-string subjectName', () => {
		expect(() => wbProductPeriodParams.parse({ subjectName: true })).toThrow();
	});

	it('passes through unknown keys (passthrough)', () => {
		const result = wbProductPeriodParams.parse({ otherParam: 42 });
		expect(result.otherParam).toBe(42);
	});

	it('uses different default limit than officeDay (1000 vs 500)', () => {
		const officeDayResult = wbOfficeDayParams.parse({});
		const periodResult = wbProductPeriodParams.parse({});
		expect(officeDayResult.limit).toBe(500);
		expect(periodResult.limit).toBe(1000);
	});
});
