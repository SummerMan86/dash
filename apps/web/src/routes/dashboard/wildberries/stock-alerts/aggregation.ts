import type { JsonValue } from '@dashboard-builder/platform-datasets';
import type {
	OfficeAggregation,
	SkuDetail,
	StockAlertKpi,
	ScenarioParams,
	FactProductOfficeDayRow
} from './types';
import { asFactRow } from './types';
import { calculateStatus } from './utils';

/**
 * Агрегирует данные по офисам
 * Группирует строки по office_id и считает статистику по статусам
 */
export function aggregateByOffice(
	rows: Array<Record<string, JsonValue>>,
	params: ScenarioParams
): OfficeAggregation[] {
	const byOffice = new Map<number, OfficeAggregation>();

	for (const rawRow of rows) {
		const row = asFactRow(rawRow);
		// Prefer turnover (coverage) metric when available; fallback to sale_rate_days for legacy datasets.
		const coverageDays = row.avg_stock_turnover_days ?? row.sale_rate_days;
		const status = calculateStatus(row.stock_count, coverageDays, params);

		let agg = byOffice.get(row.office_id);
		if (!agg) {
			agg = {
				office_id: row.office_id,
				office_name: row.office_name,
				region_name: row.region_name,
				total_sku: 0,
				deficit_count: 0,
				risk_count: 0,
				ok_count: 0,
				total_stock: 0,
				status: 'OK'
			};
			byOffice.set(row.office_id, agg);
		}

		agg.total_sku++;
		agg.total_stock += row.stock_count;

		if (status === 'DEFICIT') {
			agg.deficit_count++;
		} else if (status === 'RISK') {
			agg.risk_count++;
		} else {
			agg.ok_count++;
		}

		// Worst status wins: DEFICIT > RISK > OK
		if (status === 'DEFICIT') {
			agg.status = 'DEFICIT';
		} else if (status === 'RISK' && agg.status !== 'DEFICIT') {
			agg.status = 'RISK';
		}
	}

	// Сортировка: сначала проблемные офисы
	return Array.from(byOffice.values()).sort((a, b) => {
		// По количеству дефицитных SKU (desc)
		if (a.deficit_count !== b.deficit_count) {
			return b.deficit_count - a.deficit_count;
		}
		// По количеству рисковых SKU (desc)
		if (a.risk_count !== b.risk_count) {
			return b.risk_count - a.risk_count;
		}
		// По имени офиса (asc)
		return a.office_name.localeCompare(b.office_name, 'ru');
	});
}

/**
 * Извлекает детализацию SKU для конкретного офиса
 */
export function getSkuForOffice(
	rows: Array<Record<string, JsonValue>>,
	officeId: number,
	params: ScenarioParams
): SkuDetail[] {
	const result: SkuDetail[] = [];

	for (const rawRow of rows) {
		const row = asFactRow(rawRow);
		if (row.office_id !== officeId) continue;

		const coverageDays = row.avg_stock_turnover_days ?? row.sale_rate_days;
		const status = calculateStatus(row.stock_count, coverageDays, params);

		result.push({
			nm_id: row.nm_id,
			chrt_id: row.chrt_id,
			size_name: row.size_name,
			stock_count: row.stock_count,
			coverage_days: coverageDays,
			sale_rate_days: row.sale_rate_days,
			avg_stock_turnover_days: row.avg_stock_turnover_days,
			to_client_count: row.to_client_count,
			from_client_count: row.from_client_count,
			status
		});
	}

	// Сортировка: сначала проблемные SKU
	return result.sort((a, b) => {
		const statusOrder = { DEFICIT: 0, RISK: 1, OK: 2 };
		if (statusOrder[a.status] !== statusOrder[b.status]) {
			return statusOrder[a.status] - statusOrder[b.status];
		}
		// По остатку (asc) — меньше остаток = выше приоритет
		return a.stock_count - b.stock_count;
	});
}

/**
 * Вычисляет KPI метрики из агрегированных данных
 */
export function calculateKpi(
	aggregations: OfficeAggregation[],
	dataDate: string | null
): StockAlertKpi {
	let officesAtRisk = 0;
	let skuDeficit = 0;
	let skuRisk = 0;
	let skuOk = 0;
	let totalStock = 0;

	for (const agg of aggregations) {
		if (agg.status !== 'OK') {
			officesAtRisk++;
		}
		skuDeficit += agg.deficit_count;
		skuRisk += agg.risk_count;
		skuOk += agg.ok_count;
		totalStock += agg.total_stock;
	}

	return {
		officesAtRisk,
		totalOffices: aggregations.length,
		skuDeficit,
		skuRisk,
		skuOk,
		totalStock,
		dataDate
	};
}

/**
 * Извлекает максимальную дату из данных
 */
export function getMaxDate(rows: Array<Record<string, JsonValue>>): string | null {
	let maxDate: string | null = null;

	for (const row of rows) {
		const dt = row.dt as string | undefined;
		if (dt && (!maxDate || dt > maxDate)) {
			maxDate = dt;
		}
	}

	return maxDate;
}

/**
 * Фильтрует строки по региону (client-side filter)
 */
export function filterByRegion(
	rows: Array<Record<string, JsonValue>>,
	regionName: string | null
): Array<Record<string, JsonValue>> {
	if (!regionName) return rows;
	return rows.filter((row) => row.region_name === regionName);
}

/**
 * Получает уникальные регионы из данных
 */
export function getUniqueRegions(rows: Array<Record<string, JsonValue>>): string[] {
	const regions = new Set<string>();

	for (const row of rows) {
		const region = row.region_name as string | undefined;
		if (region) {
			regions.add(region);
		}
	}

	return Array.from(regions).sort((a, b) => a.localeCompare(b, 'ru'));
}
