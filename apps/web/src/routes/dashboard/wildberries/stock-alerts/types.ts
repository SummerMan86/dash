import type { JsonValue } from '@dashboard-builder/platform-datasets';

/** Статус SKU на складе */
export type StockStatus = 'DEFICIT' | 'RISK' | 'OK';

/** Параметры сценария расчёта */
export type ScenarioParams = {
	/** Lead time — время доставки (дни) */
	L: number;
	/** Safety stock — страховой запас (дни) */
	S: number;
	/** Review period — период пересмотра (дни) */
	R: number;
	/** Demand window — окно расчёта спроса (дни) */
	W: number;
};

/** Агрегация по офису/складу */
export type OfficeAggregation = {
	office_id: number;
	office_name: string;
	region_name: string;
	/** Всего SKU на складе */
	total_sku: number;
	/** SKU в дефиците (stock_count = 0) */
	deficit_count: number;
	/** SKU в зоне риска (coverage_days <= L+S) */
	risk_count: number;
	/** SKU в норме */
	ok_count: number;
	/** Общий остаток (шт) */
	total_stock: number;
	/** Худший статус среди SKU офиса */
	status: StockStatus;
};

/** Детализация SKU */
export type SkuDetail = {
	nm_id: number;
	chrt_id: number;
	size_name: string | null;
	stock_count: number;
	/** Покрытие/оборачиваемость в днях (используется для статуса) */
	coverage_days: number | null;
	/** Сырой показатель из датасета (оставляем для совместимости/отладки) */
	sale_rate_days: number | null;
	/** Сырой показатель из датасета (оставляем для совместимости/отладки) */
	avg_stock_turnover_days: number | null;
	to_client_count: number | null;
	from_client_count: number | null;
	status: StockStatus;
};

/** KPI метрики страницы */
export type StockAlertKpi = {
	/** Офисов с проблемами (DEFICIT или RISK) */
	officesAtRisk: number;
	/** Всего офисов */
	totalOffices: number;
	/** SKU в дефиците */
	skuDeficit: number;
	/** SKU в зоне риска */
	skuRisk: number;
	/** SKU в норме */
	skuOk: number;
	/** Общий остаток на всех офисах */
	totalStock: number;
	/** Дата среза данных */
	dataDate: string | null;
};

/** Строка из датасета fact_product_office_day */
export type FactProductOfficeDayRow = {
	dt: string;
	nm_id: number;
	chrt_id: number;
	office_id: number;
	office_name: string;
	region_name: string;
	size_name: string | null;
	stock_count: number;
	stock_sum: number | null;
	to_client_count: number | null;
	from_client_count: number | null;
	buyout_count: number | null;
	buyout_sum: number | null;
	buyout_percent: number | null;
	sale_rate_days: number | null;
	avg_stock_turnover_days: number | null;
};

/** Преобразование JsonValue row в типизированный */
export function asFactRow(row: Record<string, JsonValue>): FactProductOfficeDayRow {
	return {
		dt: row.dt as string,
		nm_id: row.nm_id as number,
		chrt_id: row.chrt_id as number,
		office_id: row.office_id as number,
		office_name: (row.office_name as string) ?? '',
		region_name: (row.region_name as string) ?? '',
		size_name: row.size_name as string | null,
		stock_count: (row.stock_count as number) ?? 0,
		stock_sum: row.stock_sum as number | null,
		to_client_count: row.to_client_count as number | null,
		from_client_count: row.from_client_count as number | null,
		buyout_count: row.buyout_count as number | null,
		buyout_sum: row.buyout_sum as number | null,
		buyout_percent: row.buyout_percent as number | null,
		sale_rate_days: row.sale_rate_days as number | null,
		avg_stock_turnover_days: row.avg_stock_turnover_days as number | null
	};
}
