import { describe, it, expect } from 'vitest';
import type { JsonValue } from '@dashboard-builder/platform-datasets';
import type { ScenarioParams, OfficeAggregation } from './types';
import {
	aggregateByOffice,
	calculateKpi,
	getMaxDate,
	filterByRegion,
	getUniqueRegions,
	getSkuForOffice
} from './aggregation';

// -- Fixtures --

const BALANCED: ScenarioParams = { L: 20, S: 10, R: 7, W: 28 };

/** Helper: create a minimal fact row with defaults */
function makeRow(overrides: Record<string, JsonValue> = {}): Record<string, JsonValue> {
	return {
		dt: '2026-04-10',
		nm_id: 100,
		chrt_id: 1000,
		office_id: 1,
		office_name: 'Склад Москва',
		region_name: 'Москва',
		size_name: 'M',
		stock_count: 50,
		stock_sum: null,
		to_client_count: 10,
		from_client_count: 2,
		buyout_count: null,
		buyout_sum: null,
		buyout_percent: null,
		sale_rate_days: 40,
		avg_stock_turnover_days: null,
		...overrides
	};
}

// -- aggregateByOffice --

describe('aggregateByOffice', () => {
	it('returns empty array for empty input', () => {
		expect(aggregateByOffice([], BALANCED)).toEqual([]);
	});

	it('aggregates a single row correctly', () => {
		const rows = [makeRow({ stock_count: 50, sale_rate_days: 40 })];
		const result = aggregateByOffice(rows, BALANCED);

		expect(result).toHaveLength(1);
		expect(result[0].office_id).toBe(1);
		expect(result[0].office_name).toBe('Склад Москва');
		expect(result[0].total_sku).toBe(1);
		expect(result[0].ok_count).toBe(1);
		expect(result[0].deficit_count).toBe(0);
		expect(result[0].risk_count).toBe(0);
		expect(result[0].total_stock).toBe(50);
		expect(result[0].status).toBe('OK');
	});

	it('counts deficit when stock_count is 0', () => {
		const rows = [makeRow({ stock_count: 0, sale_rate_days: 40 })];
		const result = aggregateByOffice(rows, BALANCED);

		expect(result[0].deficit_count).toBe(1);
		expect(result[0].ok_count).toBe(0);
		expect(result[0].status).toBe('DEFICIT');
	});

	it('counts risk when coverage_days <= L + S threshold', () => {
		// BALANCED threshold = L(20) + S(10) = 30
		const rows = [makeRow({ stock_count: 10, sale_rate_days: 25 })];
		const result = aggregateByOffice(rows, BALANCED);

		expect(result[0].risk_count).toBe(1);
		expect(result[0].ok_count).toBe(0);
		expect(result[0].status).toBe('RISK');
	});

	it('prefers avg_stock_turnover_days over sale_rate_days for coverage', () => {
		// sale_rate_days=40 would be OK, but avg_stock_turnover_days=25 should trigger RISK
		const rows = [
			makeRow({ stock_count: 10, sale_rate_days: 40, avg_stock_turnover_days: 25 })
		];
		const result = aggregateByOffice(rows, BALANCED);

		expect(result[0].risk_count).toBe(1);
		expect(result[0].status).toBe('RISK');
	});

	it('groups multiple rows by office_id', () => {
		const rows = [
			makeRow({ office_id: 1, nm_id: 100, stock_count: 50, sale_rate_days: 40 }),
			makeRow({ office_id: 1, nm_id: 101, stock_count: 30, sale_rate_days: 35 }),
			makeRow({ office_id: 2, nm_id: 200, office_name: 'Склад СПб', stock_count: 20, sale_rate_days: 50 })
		];
		const result = aggregateByOffice(rows, BALANCED);

		expect(result).toHaveLength(2);

		const office1 = result.find((o) => o.office_id === 1)!;
		expect(office1.total_sku).toBe(2);
		expect(office1.total_stock).toBe(80);

		const office2 = result.find((o) => o.office_id === 2)!;
		expect(office2.total_sku).toBe(1);
		expect(office2.total_stock).toBe(20);
	});

	it('worst status wins: DEFICIT > RISK > OK', () => {
		const rows = [
			makeRow({ office_id: 1, nm_id: 100, stock_count: 50, sale_rate_days: 40 }), // OK
			makeRow({ office_id: 1, nm_id: 101, stock_count: 10, sale_rate_days: 25 }), // RISK
			makeRow({ office_id: 1, nm_id: 102, stock_count: 0 }) // DEFICIT
		];
		const result = aggregateByOffice(rows, BALANCED);

		expect(result[0].status).toBe('DEFICIT');
		expect(result[0].deficit_count).toBe(1);
		expect(result[0].risk_count).toBe(1);
		expect(result[0].ok_count).toBe(1);
	});

	it('sorts offices by deficit_count desc, then risk_count desc, then name asc', () => {
		const rows = [
			// Office A: 0 deficit, 0 risk
			makeRow({ office_id: 1, office_name: 'A', stock_count: 50, sale_rate_days: 40 }),
			// Office B: 1 deficit
			makeRow({ office_id: 2, office_name: 'B', stock_count: 0 }),
			// Office C: 0 deficit, 1 risk
			makeRow({ office_id: 3, office_name: 'C', stock_count: 10, sale_rate_days: 25 })
		];
		const result = aggregateByOffice(rows, BALANCED);

		expect(result[0].office_name).toBe('B'); // 1 deficit
		expect(result[1].office_name).toBe('C'); // 0 deficit, 1 risk
		expect(result[2].office_name).toBe('A'); // all OK
	});
});

// -- calculateKpi --

describe('calculateKpi', () => {
	it('computes KPI from aggregations', () => {
		const aggregations: OfficeAggregation[] = [
			{
				office_id: 1,
				office_name: 'A',
				region_name: 'R1',
				total_sku: 10,
				deficit_count: 2,
				risk_count: 3,
				ok_count: 5,
				total_stock: 1000,
				status: 'DEFICIT'
			},
			{
				office_id: 2,
				office_name: 'B',
				region_name: 'R2',
				total_sku: 5,
				deficit_count: 0,
				risk_count: 0,
				ok_count: 5,
				total_stock: 500,
				status: 'OK'
			}
		];

		const kpi = calculateKpi(aggregations, '2026-04-10');

		expect(kpi.officesAtRisk).toBe(1); // only A is at risk
		expect(kpi.totalOffices).toBe(2);
		expect(kpi.skuDeficit).toBe(2);
		expect(kpi.skuRisk).toBe(3);
		expect(kpi.skuOk).toBe(10);
		expect(kpi.totalStock).toBe(1500);
		expect(kpi.dataDate).toBe('2026-04-10');
	});

	it('counts offices with RISK status as at-risk', () => {
		const aggregations: OfficeAggregation[] = [
			{
				office_id: 1,
				office_name: 'A',
				region_name: 'R1',
				total_sku: 3,
				deficit_count: 0,
				risk_count: 2,
				ok_count: 1,
				total_stock: 300,
				status: 'RISK'
			}
		];

		const kpi = calculateKpi(aggregations, null);

		expect(kpi.officesAtRisk).toBe(1);
		expect(kpi.dataDate).toBeNull();
	});

	it('returns zeros for empty aggregations', () => {
		const kpi = calculateKpi([], null);

		expect(kpi.officesAtRisk).toBe(0);
		expect(kpi.totalOffices).toBe(0);
		expect(kpi.skuDeficit).toBe(0);
		expect(kpi.totalStock).toBe(0);
	});
});

// -- getMaxDate --

describe('getMaxDate', () => {
	it('returns null for empty rows', () => {
		expect(getMaxDate([])).toBeNull();
	});

	it('returns the single date', () => {
		const rows = [makeRow({ dt: '2026-04-10' })];
		expect(getMaxDate(rows)).toBe('2026-04-10');
	});

	it('returns the maximum date from multiple rows', () => {
		const rows = [
			makeRow({ dt: '2026-04-08' }),
			makeRow({ dt: '2026-04-10' }),
			makeRow({ dt: '2026-04-09' })
		];
		expect(getMaxDate(rows)).toBe('2026-04-10');
	});

	it('skips rows without dt field', () => {
		const rows = [
			{ region_name: 'Москва' } as Record<string, JsonValue>,
			makeRow({ dt: '2026-04-05' })
		];
		expect(getMaxDate(rows)).toBe('2026-04-05');
	});
});

// -- filterByRegion --

describe('filterByRegion', () => {
	it('returns all rows when regionName is null', () => {
		const rows = [
			makeRow({ region_name: 'Москва' }),
			makeRow({ region_name: 'СПб' })
		];
		expect(filterByRegion(rows, null)).toHaveLength(2);
	});

	it('filters rows by exact region name', () => {
		const rows = [
			makeRow({ region_name: 'Москва' }),
			makeRow({ region_name: 'СПб' }),
			makeRow({ region_name: 'Москва' })
		];
		const result = filterByRegion(rows, 'Москва');

		expect(result).toHaveLength(2);
		expect(result.every((r) => r.region_name === 'Москва')).toBe(true);
	});

	it('returns empty array when no rows match', () => {
		const rows = [makeRow({ region_name: 'Москва' })];
		expect(filterByRegion(rows, 'Казань')).toHaveLength(0);
	});
});

// -- getUniqueRegions --

describe('getUniqueRegions', () => {
	it('returns empty array for empty rows', () => {
		expect(getUniqueRegions([])).toEqual([]);
	});

	it('returns unique sorted region names', () => {
		const rows = [
			makeRow({ region_name: 'СПб' }),
			makeRow({ region_name: 'Москва' }),
			makeRow({ region_name: 'СПб' }),
			makeRow({ region_name: 'Казань' })
		];
		const result = getUniqueRegions(rows);

		expect(result).toEqual(['Казань', 'Москва', 'СПб']);
	});

	it('skips rows without region_name', () => {
		const rows = [
			makeRow({ region_name: 'Москва' }),
			{ nm_id: 1 } as Record<string, JsonValue>
		];
		const result = getUniqueRegions(rows);

		expect(result).toEqual(['Москва']);
	});
});

// -- getSkuForOffice --

describe('getSkuForOffice', () => {
	it('returns empty array when no rows match officeId', () => {
		const rows = [makeRow({ office_id: 1 })];
		expect(getSkuForOffice(rows, 999, BALANCED)).toEqual([]);
	});

	it('returns SKU details for the given office', () => {
		const rows = [
			makeRow({ office_id: 1, nm_id: 100, chrt_id: 1000, stock_count: 50, sale_rate_days: 40 }),
			makeRow({ office_id: 1, nm_id: 101, chrt_id: 1001, stock_count: 10, sale_rate_days: 25 }),
			makeRow({ office_id: 2, nm_id: 200, chrt_id: 2000, stock_count: 30, sale_rate_days: 40 })
		];
		const result = getSkuForOffice(rows, 1, BALANCED);

		expect(result).toHaveLength(2);
		expect(result.map((s) => s.nm_id)).toContain(100);
		expect(result.map((s) => s.nm_id)).toContain(101);
		// Should NOT contain office_id=2 row
		expect(result.map((s) => s.nm_id)).not.toContain(200);
	});

	it('assigns correct status to each SKU', () => {
		const rows = [
			makeRow({ office_id: 1, nm_id: 100, stock_count: 0 }), // DEFICIT
			makeRow({ office_id: 1, nm_id: 101, stock_count: 10, sale_rate_days: 25 }), // RISK (25 <= 30)
			makeRow({ office_id: 1, nm_id: 102, stock_count: 50, sale_rate_days: 40 }) // OK
		];
		const result = getSkuForOffice(rows, 1, BALANCED);

		const deficit = result.find((s) => s.nm_id === 100)!;
		const risk = result.find((s) => s.nm_id === 101)!;
		const ok = result.find((s) => s.nm_id === 102)!;

		expect(deficit.status).toBe('DEFICIT');
		expect(risk.status).toBe('RISK');
		expect(ok.status).toBe('OK');
	});

	it('sorts by status (DEFICIT first, then RISK, then OK), then by stock_count asc', () => {
		const rows = [
			makeRow({ office_id: 1, nm_id: 100, stock_count: 50, sale_rate_days: 40 }), // OK
			makeRow({ office_id: 1, nm_id: 101, stock_count: 0 }), // DEFICIT
			makeRow({ office_id: 1, nm_id: 102, stock_count: 5, sale_rate_days: 25 }), // RISK
			makeRow({ office_id: 1, nm_id: 103, stock_count: 15, sale_rate_days: 20 }) // RISK (higher stock)
		];
		const result = getSkuForOffice(rows, 1, BALANCED);

		expect(result[0].status).toBe('DEFICIT');
		expect(result[1].status).toBe('RISK');
		expect(result[1].stock_count).toBe(5); // lower stock first
		expect(result[2].status).toBe('RISK');
		expect(result[2].stock_count).toBe(15);
		expect(result[3].status).toBe('OK');
	});

	it('populates coverage_days from avg_stock_turnover_days when available', () => {
		const rows = [
			makeRow({
				office_id: 1,
				nm_id: 100,
				stock_count: 50,
				sale_rate_days: 40,
				avg_stock_turnover_days: 35
			})
		];
		const result = getSkuForOffice(rows, 1, BALANCED);

		expect(result[0].coverage_days).toBe(35); // prefers avg_stock_turnover_days
		expect(result[0].sale_rate_days).toBe(40); // raw value preserved
		expect(result[0].avg_stock_turnover_days).toBe(35);
	});
});
