<script lang="ts">
	import { onMount } from 'svelte';
	import type { EChartsOption } from 'echarts';

	import type { DatasetResponse, JsonValue } from '$entities/dataset';
	import { fetchDataset } from '$shared/api/fetchDataset';
	import { Badge } from '$shared/ui/badge';
	import { Button } from '$shared/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$shared/ui/card';
	import { Chart } from '$shared/ui/chart';
	import { ChartCard } from '$shared/ui/chart-card';
	import { ProgressBar } from '$shared/ui/progress-bar';
	import { ProgressCircle } from '$shared/ui/progress-circle';
	import { Select } from '$shared/ui/select';
	import { StatCard } from '$shared/ui/stat-card';
	import { formatDate, formatNumber, formatPercent, truncate } from '$shared/utils';

	const DATASET_IDS = {
		documents: 'strategy.documents_dim',
		metricDetail: 'strategy.metric_detail',
		kpiProvenance: 'strategy.kpi_provenance',
		cascade: 'strategy.cascade_coverage',
		gap: 'strategy.gap_overview',
		bsc: 'strategy.bsc_overview',
		source: 'strategy.source_coverage',
		executive: 'strategy.executive_kpi_v2'
	} as const;

	type DatasetRow = Record<string, JsonValue>;
	type SelectOption = { value: string; label: string };
	type ConfidenceLevel = 'high' | 'medium' | 'low';
	type ProgressVariant = 'default' | 'success' | 'warning' | 'error' | 'accent';
	type KpiEntryRow = {
		selectionKey: string;
		chainId: string | null;
		metricCode: string | null;
		metricName: string | null;
		periodKey: string | null;
		horizonCode: string | null;
		departmentCode: string | null;
		perspectiveCode: string | null;
		confidence: ConfidenceLevel | null;
		documentCount: number;
		evidenceCount: number;
		recordSources: string[];
		representative: DatasetRow;
	};

	const HORIZON_ORDER = ['LT', 'MT', 'ST', 'OT'] as const;
	const HORIZON_LABELS: Record<string, string> = {
		LT: 'Долгосрочный',
		MT: 'Среднесрочный',
		ST: 'Краткосрочный',
		OT: 'Операционный'
	};
	const RECORD_SOURCE_LABELS: Record<string, string> = {
		auto_extracted_facts: 'Авто-извлечение',
		kpi_decomposition: 'Декомпозиция KPI',
		data_source_map: 'Карта источников'
	};
	const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = {
		high: 0,
		medium: 1,
		low: 2
	};
	const PERCENT_UNITS = new Set(['percent', '%', 'PERCENT', 'pct']);
	const UNIT_LABELS: Record<string, string> = {
		percent: '%',
		'%': '%',
		PERCENT: '%',
		pct: '%',
		kt: 'кт',
		bcm: 'млрд м3',
		million_tonnes_per_year: 'млн т/год',
		rub_mn: 'млн руб.',
		rub_bn: 'млрд руб.',
		rub: 'руб.',
		persons: 'чел.',
		meters: 'м',
		wells: 'скв.',
		hours: 'ч',
		person_hours: 'чел.-ч',
		events: 'событ.',
		projects: 'проек.',
		date: '',
		days: 'дн.',
		million_m3: 'млн м3',
		fraction: 'доли ед.',
		well: 'скв.',
		million: 'млн',
		thousand_t: 'тыс. т',
		m: 'м',
		MPa: 'МПа',
		m_abs: 'м абс.',
		count: 'шт.',
		day: 'дн.',
		m3: 'м3',
		'm3/day': 'м3/сут',
		'thousand_m3/day': 'тыс. м3/сут',
		'g/m3': 'г/м3',
		thousand: 'тыс.',
		thousand_m3: 'тыс. м3',
		scale: 'масштаб',
		year: 'год',
		km: 'км',
		degC: '°C',
		thousand_m2: 'тыс. м2',
		cargo: 'партия',
		'million_m3/day': 'млн м3/сут',
		wt_pct: '% масс.',
		'kg/m3': 'кг/м3',
		'thousand_m3/ha': 'тыс. м3/га',
		'million_t/year': 'млн т/год',
		billion: 'млрд',
		million_t: 'млн т',
		'tCO2eq/t': 'т CO2-экв./т',
		million_rub: 'млн руб.',
		'kg/kmol': 'кг/кмоль',
		'mln RUB': 'млн руб.',
		person: 'чел.',
		MLN_RUB: 'млн руб.',
		'm/day': 'м/сут',
		million_bbl: 'млн барр.',
		billion_m3: 'млрд м3',
		'MMscf/day': 'млн ст. куб. фут/сут',
		thousand_usd: 'тыс. долл. США',
		unit_fraction: 'доли ед.',
		'USD/bbl': 'долл. США/барр.',
		'thousand_bbl/day': 'тыс. барр./сут',
		'million_t/month': 'млн т/мес',
		dimensionless: 'безразм.',
		'GJ/t': 'ГДж/т',
		mPa_s: 'мПа·с',
		't/day': 'т/сут',
		'MPa2/(thousand_m3/day)': 'МПа2/(тыс. м3/сут)',
		'MPa2/(thousand_m3/day)^2': 'МПа2/(тыс. м3/сут)^2',
		well_slot: 'слот скважины',
		'RUB/USD': 'руб./долл. США',
		'm3/t': 'м3/т',
		thousand_m: 'тыс. м',
		km2: 'км2',
		layer: 'слой',
		object: 'объект',
		lateral: 'боковой ствол',
		'thousand_m/day': 'тыс. м/сут',
		hour: 'ч',
		'mg/l': 'мг/л',
		book: 'книга',
		month: 'мес.',
		mm: 'мм',
		'USD/t': 'долл. США/т',
		'bcm/year': 'млрд м3/год',
		linear_km: 'пог. км',
		'RUB/thousand_m3': 'руб./тыс. м3',
		bar: 'бар',
		'g/cm3': 'г/см3',
		million_mod: 'млн мод.',
		test: 'испытание',
		reservoir: 'залежь',
		mD: 'мД'
	};

	let loading = $state(true);
	let error = $state<string | null>(null);
	let documentsData = $state<DatasetResponse | null>(null);
	let metricData = $state<DatasetResponse | null>(null);
	let cascadeData = $state<DatasetResponse | null>(null);
	let gapData = $state<DatasetResponse | null>(null);
	let bscData = $state<DatasetResponse | null>(null);
	let sourceData = $state<DatasetResponse | null>(null);
	let executiveData = $state<DatasetResponse | null>(null);
	let provenanceData = $state<DatasetResponse | null>(null);
	let provenanceLoading = $state(false);
	let provenanceError = $state<string | null>(null);
	let selectedKpiSelectionKey = $state<string | null>(null);
	let provenanceRequestId = 0;

	let selectedDepartment = $state('all');
	let selectedHorizon = $state('all');
	let selectedPerspective = $state('all');
	let selectedRecordSource = $state('all');
	let gapOnly = $state(false);

	type TabId = 'overview' | 'cascade' | 'quality';
	const TABS: { id: TabId; label: string; description: string }[] = [
		{ id: 'overview', label: 'Обзор', description: 'Ключевые показатели для руководства' },
		{ id: 'cascade', label: 'Каскад и разрывы', description: 'Детализация цепочек и расхождений' },
		{ id: 'quality', label: 'Качество данных', description: 'Источники, покрытие и обоснование' }
	];
	let activeTab = $state<TabId>('overview');

	function drillToGaps() {
		activeTab = 'cascade';
	}

	function drillToProvenance(entry: KpiEntryRow) {
		activeTab = 'quality';
		selectedKpiSelectionKey = entry.selectionKey;
	}

	function asString(value: JsonValue | undefined): string | null {
		return typeof value === 'string' && value.trim() ? value : null;
	}

	function asNumber(value: JsonValue | undefined): number | null {
		if (typeof value === 'number' && Number.isFinite(value)) return value;
		if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
			return Number(value);
		}
		return null;
	}

	function asBoolean(value: JsonValue | undefined): boolean | null {
		if (typeof value === 'boolean') return value;
		if (value === 'true') return true;
		if (value === 'false') return false;
		return null;
	}

	function sortByHorizon(a: string, b: string): number {
		const ai = HORIZON_ORDER.indexOf(a as (typeof HORIZON_ORDER)[number]);
		const bi = HORIZON_ORDER.indexOf(b as (typeof HORIZON_ORDER)[number]);
		if (ai === -1 && bi === -1) return a.localeCompare(b);
		if (ai === -1) return 1;
		if (bi === -1) return -1;
		return ai - bi;
	}

	function horizonLabel(code: string | null): string {
		return code ? (HORIZON_LABELS[code] ?? code) : '\u2014';
	}

	function recordSourceLabel(code: string | null): string {
		return code ? (RECORD_SOURCE_LABELS[code] ?? code) : '\u2014';
	}

	function unitLabel(unit: string | null): string {
		return unit ? (UNIT_LABELS[unit] ?? unit) : '';
	}

	function average(values: Array<number | null | undefined>): number | null {
		const numericValues = values.filter((value): value is number => typeof value === 'number');
		if (!numericValues.length) return null;
		return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
	}

	function sum(values: Array<number | null | undefined>): number {
		return values.reduce<number>((acc, value) => acc + (typeof value === 'number' ? value : 0), 0);
	}

	function formatCell(value: JsonValue | undefined): string {
		if (value === null || typeof value === 'undefined') return '\u2014';
		if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
		if (typeof value === 'number') return formatNumber(value, { maximumFractionDigits: 2 });
		if (typeof value === 'string' && value.trim()) return value;
		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}

	function formatRatio(value: number | null | undefined, decimals = 1): string {
		if (typeof value !== 'number') return '\u2014';
		return formatPercent(value * 100, { decimals });
	}

	function formatSignedRatio(value: number | null | undefined, decimals = 1): string {
		if (typeof value !== 'number') return '\u2014';
		return formatPercent(value * 100, { showSign: true, decimals });
	}

	function metricValueFromRow(row: DatasetRow): number | null {
		return asNumber(row.actual_value) ?? asNumber(row.target_value) ?? asNumber(row.metric_value);
	}

	function metricDisplayValue(row: DatasetRow): string {
		const unit = asString(row.unit);
		if (unit === 'date') return asString(row.metric_value_text) ?? '\u2014';

		const numericValue = metricValueFromRow(row);
		if (numericValue !== null) {
			if (unit && PERCENT_UNITS.has(unit)) {
				return formatPercent(numericValue, { decimals: 1, showSign: false });
			}
			const renderedUnit = unitLabel(unit);
			return `${formatNumber(numericValue, { maximumFractionDigits: 2 })}${renderedUnit ? ` ${renderedUnit}` : ''}`;
		}

		return asString(row.metric_value_text) ?? '\u2014';
	}

	function confidenceLevel(value: JsonValue | undefined): ConfidenceLevel | null {
		const normalized = asString(value)?.toLowerCase();
		if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
			return normalized as ConfidenceLevel;
		}
		return null;
	}

	function confidenceSortValue(value: ConfidenceLevel | null): number {
		return value ? (CONFIDENCE_RANK[value] ?? 3) : 3;
	}

	function provenanceLocatorLabel(row: DatasetRow): string {
		return asString(row.source_page) ?? asString(row.source_locator) ?? 'Локатор не указан';
	}

	function documentIdentity(row: DatasetRow): string {
		return (
			asString(row.document_code) ??
			asString(row.document_file) ??
			asString(row.document_name) ??
			'document'
		);
	}

	function evidenceIdentity(row: DatasetRow): string {
		return `${documentIdentity(row)}::${asString(row.source_page) ?? asString(row.source_locator) ?? 'locator'}`;
	}

	function kpiSelectionKey(row: {
		chainId: string | null;
		metricCode: string | null;
		periodKey: string | null;
		horizonCode: string | null;
		departmentCode: string | null;
		perspectiveCode: string | null;
	}): string {
		return [
			row.chainId ?? 'chain',
			row.metricCode ?? 'metric',
			row.periodKey ?? 'period',
			row.horizonCode ?? 'horizon',
			row.departmentCode ?? 'department',
			row.perspectiveCode ?? 'perspective'
		].join('::');
	}

	function metricRepresentativeRank(row: DatasetRow): number {
		const valuePenalty =
			metricValueFromRow(row) === null && !asString(row.metric_value_text) ? 5 : 0;
		const recordSourcePenalty = asString(row.record_source) === 'auto_extracted_facts' ? 0 : 1;
		return (
			confidenceSortValue(confidenceLevel(row.extractability)) + valuePenalty + recordSourcePenalty
		);
	}

	function executiveMetricDisplayValue(row: DatasetRow): string {
		const textValue = asString(row.display_value_text);
		if (textValue) return textValue;

		const unit = asString(row.display_unit) ?? asString(row.unit);
		const numericValue = asNumber(row.display_value_numeric);

		if (numericValue !== null) {
			if (unit && PERCENT_UNITS.has(unit)) {
				return formatPercent(numericValue, { decimals: 1, showSign: false });
			}
			const renderedUnit = unitLabel(unit);
			return `${formatNumber(numericValue, { maximumFractionDigits: 2 })}${renderedUnit ? ` ${renderedUnit}` : ''}`;
		}

		return '\u2014';
	}

	function statusBadgeVariant(
		status: string | null
	): 'success' | 'warning' | 'error' | 'info' | 'muted' {
		switch (status?.toLowerCase()) {
			case 'ok':
			case 'aligned':
			case 'complete':
				return 'success';
			case 'warning':
			case 'attention':
				return 'warning';
			case 'gap':
			case 'missing':
				return 'error';
			default:
				return 'muted';
		}
	}

	function confidenceVariant(level: string | null): 'success' | 'warning' | 'error' | 'muted' {
		switch (level?.toLowerCase()) {
			case 'high':
				return 'success';
			case 'medium':
				return 'warning';
			case 'low':
				return 'error';
			default:
				return 'muted';
		}
	}

	function readinessVariant(status: string | null): 'success' | 'warning' | 'error' | 'muted' {
		switch (status?.toLowerCase()) {
			case 'ready_limited':
				return 'success';
			case 'needs_review':
				return 'warning';
			case 'not_ready':
				return 'error';
			default:
				return 'muted';
		}
	}

	function progressVariant(value: number | null | undefined): ProgressVariant {
		if (typeof value !== 'number') return 'default';
		if (value >= 0.85) return 'success';
		if (value >= 0.65) return 'warning';
		return 'error';
	}

	function isSelected(code: string | null, selected: string): boolean {
		if (selected === 'all') return true;
		return code === selected;
	}

	function makeOptions(
		rows: DatasetRow[],
		codeKey: string,
		labelKey?: string,
		fallbackLabel?: (code: string) => string
	): SelectOption[] {
		const options = new Map<string, string>();
		for (const row of rows) {
			const code = asString(row[codeKey]);
			if (!code) continue;
			const label = asString(labelKey ? row[labelKey] : undefined) ?? fallbackLabel?.(code) ?? code;
			options.set(code, label);
		}
		return Array.from(options.entries())
			.sort(([aCode], [bCode]) => {
				if (codeKey.includes('horizon')) return sortByHorizon(aCode, bCode);
				return aCode.localeCompare(bCode);
			})
			.map(([value, label]) => ({ value, label }));
	}

	function resetFilters() {
		selectedDepartment = 'all';
		selectedHorizon = 'all';
		selectedPerspective = 'all';
		selectedRecordSource = 'all';
		gapOnly = false;
	}

	function closeProvenancePanel() {
		provenanceRequestId += 1;
		selectedKpiSelectionKey = null;
		provenanceData = null;
		provenanceError = null;
		provenanceLoading = false;
	}

	async function loadSelectedKpiProvenance(entry: KpiEntryRow) {
		if (!entry.metricCode) {
			provenanceData = null;
			provenanceError = 'У выбранного KPI отсутствует metric_code.';
			provenanceLoading = false;
			return;
		}

		const requestId = ++provenanceRequestId;
		provenanceLoading = true;
		provenanceData = null;
		provenanceError = null;

		try {
			const response = await fetchDataset({
				id: DATASET_IDS.kpiProvenance,
				params: {
					limit: 500,
					metricCode: entry.metricCode,
					periodKey: entry.periodKey,
					horizonCode: entry.horizonCode,
					chainId: entry.chainId,
					departmentCode: entry.departmentCode,
					perspectiveCode: entry.perspectiveCode,
					...(selectedRecordSource !== 'all' ? { recordSource: selectedRecordSource } : {})
				},
				cache: { ttlMs: 0 }
			});

			if (requestId !== provenanceRequestId) return;
			provenanceData = response;
		} catch (e) {
			if (requestId !== provenanceRequestId) return;
			provenanceData = null;
			provenanceError = e instanceof Error ? e.message : 'Не удалось загрузить provenance KPI';
		} finally {
			if (requestId === provenanceRequestId) {
				provenanceLoading = false;
			}
		}
	}

	async function reload() {
		loading = true;
		error = null;

		try {
			const [documents, metricDetail, cascade, gap, bsc, source, executive] = await Promise.all([
				fetchDataset({ id: DATASET_IDS.documents, params: { limit: 5_000 }, cache: { ttlMs: 0 } }),
				fetchDataset({
					id: DATASET_IDS.metricDetail,
					params: { limit: 10_000 },
					cache: { ttlMs: 0 }
				}),
				fetchDataset({ id: DATASET_IDS.cascade, params: { limit: 2_000 }, cache: { ttlMs: 0 } }),
				fetchDataset({ id: DATASET_IDS.gap, params: { limit: 5_000 }, cache: { ttlMs: 0 } }),
				fetchDataset({ id: DATASET_IDS.bsc, params: { limit: 5_000 }, cache: { ttlMs: 0 } }),
				fetchDataset({ id: DATASET_IDS.source, params: { limit: 5_000 }, cache: { ttlMs: 0 } }),
				fetchDataset({ id: DATASET_IDS.executive, params: { limit: 100 }, cache: { ttlMs: 0 } })
			]);

			documentsData = documents;
			metricData = metricDetail;
			cascadeData = cascade;
			gapData = gap;
			bscData = bsc;
			sourceData = source;
			executiveData = executive;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Не удалось загрузить strategy datasets';
			documentsData = null;
			metricData = null;
			cascadeData = null;
			gapData = null;
			bscData = null;
			sourceData = null;
			executiveData = null;
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void reload();
	});

	let documentRows = $derived.by(() => (documentsData?.rows ?? []) as DatasetRow[]);
	let metricRows = $derived.by(() => (metricData?.rows ?? []) as DatasetRow[]);
	let cascadeRows = $derived.by(() => (cascadeData?.rows ?? []) as DatasetRow[]);
	let gapRows = $derived.by(() => (gapData?.rows ?? []) as DatasetRow[]);
	let bscRows = $derived.by(() => (bscData?.rows ?? []) as DatasetRow[]);
	let sourceRows = $derived.by(() => (sourceData?.rows ?? []) as DatasetRow[]);
	let executiveRows = $derived.by(() => (executiveData?.rows ?? []) as DatasetRow[]);
	let hasLoadedAnyData = $derived.by(
		() =>
			Boolean(documentsData) ||
			Boolean(metricData) ||
			Boolean(cascadeData) ||
			Boolean(gapData) ||
			Boolean(bscData) ||
			Boolean(sourceData) ||
			Boolean(executiveData)
	);

	let allRows = $derived.by(() => [
		...documentRows,
		...metricRows,
		...cascadeRows,
		...gapRows,
		...bscRows,
		...sourceRows,
		...executiveRows
	]);

	let latestLoadedAt = $derived.by(() => {
		const loadedAt = allRows
			.map((row) => asString(row.loaded_at))
			.filter((value): value is string => typeof value === 'string' && value.length > 0)
			.sort()
			.at(-1);

		return loadedAt
			? formatDate(loadedAt, { day: '2-digit', month: 'short', year: 'numeric' })
			: null;
	});

	let departmentOptions = $derived.by(() => {
		const mergedRows = [
			...documentRows,
			...metricRows,
			...gapRows,
			...bscRows,
			...cascadeRows,
			...executiveRows
		];
		return makeOptions(mergedRows, 'department_code');
	});
	let perspectiveOptions = $derived.by(() =>
		makeOptions(
			[...metricRows, ...bscRows, ...executiveRows],
			'perspective_code',
			'perspective_name'
		)
	);
	let horizonOptions = $derived.by(() =>
		makeOptions(
			[...documentRows, ...metricRows, ...sourceRows, ...bscRows, ...executiveRows],
			'horizon_code',
			'horizon_name',
			horizonLabel
		)
	);
	let recordSourceOptions = $derived.by(() =>
		makeOptions([...metricRows, ...sourceRows], 'record_source', undefined, recordSourceLabel)
	);

	let filteredDocumentRows = $derived.by(() =>
		documentRows.filter((row) => {
			const departmentCode = asString(row.department_code);
			const horizonCode = asString(row.horizon_code);
			const perspectiveCode = asString(row.perspective_code);
			return (
				isSelected(departmentCode, selectedDepartment) &&
				isSelected(horizonCode, selectedHorizon) &&
				isSelected(perspectiveCode, selectedPerspective)
			);
		})
	);

	let filteredMetricRows = $derived.by(() =>
		metricRows.filter((row) => {
			const departmentCode = asString(row.department_code);
			const horizonCode = asString(row.horizon_code);
			const perspectiveCode = asString(row.perspective_code);
			const recordSource = asString(row.record_source);
			return (
				isSelected(departmentCode, selectedDepartment) &&
				isSelected(horizonCode, selectedHorizon) &&
				isSelected(perspectiveCode, selectedPerspective) &&
				isSelected(recordSource, selectedRecordSource)
			);
		})
	);

	let filteredCascadeRows = $derived.by(() =>
		cascadeRows.filter((row) => isSelected(asString(row.department_code), selectedDepartment))
	);

	let filteredGapRows = $derived.by(() =>
		gapRows.filter((row) => {
			const departmentCode = asString(row.department_code);
			const horizonCode = asString(row.parent_horizon_code);
			const perspectiveCode = asString(row.perspective_code);
			const isGap = asBoolean(row.gap_flag) === true;
			return (
				isSelected(departmentCode, selectedDepartment) &&
				isSelected(horizonCode, selectedHorizon) &&
				isSelected(perspectiveCode, selectedPerspective) &&
				(!gapOnly || isGap)
			);
		})
	);

	let filteredBscRows = $derived.by(() =>
		bscRows.filter((row) => {
			const departmentCode = asString(row.department_code);
			const horizonCode = asString(row.horizon_code);
			const perspectiveCode = asString(row.perspective_code);
			return (
				isSelected(departmentCode, selectedDepartment) &&
				isSelected(horizonCode, selectedHorizon) &&
				isSelected(perspectiveCode, selectedPerspective)
			);
		})
	);

	let filteredSourceRows = $derived.by(() =>
		sourceRows.filter((row) => {
			const departmentCode = asString(row.department_code);
			const horizonCode = asString(row.horizon_code);
			const perspectiveCode = asString(row.perspective_code);
			const recordSource = asString(row.record_source);
			return (
				isSelected(departmentCode, selectedDepartment) &&
				isSelected(horizonCode, selectedHorizon) &&
				isSelected(perspectiveCode, selectedPerspective) &&
				isSelected(recordSource, selectedRecordSource)
			);
		})
	);

	let filteredExecutiveRows = $derived.by(() =>
		executiveRows.filter((row) => {
			const departmentCode = asString(row.department_code);
			const perspectiveCode = asString(row.perspective_code);
			const horizonCode = asString(row.latest_horizon_code);
			return (
				isSelected(departmentCode, selectedDepartment) &&
				isSelected(perspectiveCode, selectedPerspective) &&
				isSelected(horizonCode, selectedHorizon)
			);
		})
	);

	let kpiEntryRows = $derived.by(() => {
		const byKey = new Map<
			string,
			{
				representative: DatasetRow;
				documentIds: Set<string>;
				evidenceIds: Set<string>;
				recordSources: Set<string>;
				confidence: ConfidenceLevel | null;
			}
		>();

		for (const row of filteredMetricRows) {
			const chainId = asString(row.chain_id);
			const metricCode = asString(row.metric_code);
			const periodKey = asString(row.period_key);
			const horizonCode = asString(row.horizon_code);
			const departmentCode = asString(row.department_code);
			const perspectiveCode = asString(row.perspective_code);
			const entryKey = kpiSelectionKey({
				chainId,
				metricCode,
				periodKey,
				horizonCode,
				departmentCode,
				perspectiveCode
			});
			const current = byKey.get(entryKey) ?? {
				representative: row,
				documentIds: new Set<string>(),
				evidenceIds: new Set<string>(),
				recordSources: new Set<string>(),
				confidence: confidenceLevel(row.extractability)
			};

			if (metricRepresentativeRank(row) < metricRepresentativeRank(current.representative)) {
				current.representative = row;
			}

			current.documentIds.add(documentIdentity(row));
			current.evidenceIds.add(evidenceIdentity(row));

			const recordSource = asString(row.record_source);
			if (recordSource) current.recordSources.add(recordSource);

			const rowConfidence = confidenceLevel(row.extractability);
			if (confidenceSortValue(rowConfidence) < confidenceSortValue(current.confidence)) {
				current.confidence = rowConfidence;
			}

			byKey.set(entryKey, current);
		}

		return Array.from(byKey.entries())
			.map(([selectionKey, value]) => ({
				selectionKey,
				chainId: asString(value.representative.chain_id),
				metricCode: asString(value.representative.metric_code),
				metricName: asString(value.representative.metric_name),
				periodKey: asString(value.representative.period_key),
				horizonCode: asString(value.representative.horizon_code),
				departmentCode: asString(value.representative.department_code),
				perspectiveCode: asString(value.representative.perspective_code),
				confidence: value.confidence,
				documentCount: value.documentIds.size,
				evidenceCount: value.evidenceIds.size,
				recordSources: Array.from(value.recordSources.values()).sort((a, b) => a.localeCompare(b)),
				representative: value.representative
			}))
			.sort(
				(a, b) =>
					confidenceSortValue(a.confidence) - confidenceSortValue(b.confidence) ||
					sortByHorizon(a.horizonCode ?? '', b.horizonCode ?? '') ||
					(a.metricName ?? a.metricCode ?? '').localeCompare(b.metricName ?? b.metricCode ?? '') ||
					(a.periodKey ?? '').localeCompare(b.periodKey ?? '')
			);
	});

	let documentCount = $derived.by(() => filteredDocumentRows.length);
	let factCount = $derived.by(() => filteredMetricRows.length);
	let autoExtractCount = $derived.by(
		() =>
			filteredMetricRows.filter((row) => asString(row.record_source) === 'auto_extracted_facts')
				.length
	);
	let executiveCuratedCount = $derived.by(() => filteredExecutiveRows.length);
	let kpiEntryCount = $derived.by(() => kpiEntryRows.length);
	let numericGapCount = $derived.by(
		() => filteredGapRows.filter((row) => asBoolean(row.gap_flag) === true).length
	);
	let structuralGapCount = $derived.by(
		() =>
			filteredCascadeRows.filter((row) => (asNumber(row.missing_transition_count) ?? 0) > 0).length
	);
	let averageCascadeCoverage = $derived.by(() =>
		average(filteredCascadeRows.map((row) => asNumber(row.coverage_pct)))
	);
	let hasBscActuals = $derived.by(() =>
		filteredBscRows.some((row) => asNumber(row.actual_score) !== null)
	);
	let averageBscScore = $derived.by(() =>
		hasBscActuals ? average(filteredBscRows.map((row) => asNumber(row.actual_score))) : null
	);
	let kpiWithGapCount = $derived.by(() =>
		sum(filteredBscRows.map((row) => asNumber(row.kpi_with_gap_count)))
	);
	let horizonCoverage = $derived.by(() => {
		const horizons = new Set<string>();
		for (const row of filteredDocumentRows) {
			const horizonCode = asString(row.horizon_code);
			if (horizonCode) horizons.add(horizonCode);
		}
		for (const row of filteredSourceRows) {
			const horizonCode = asString(row.horizon_code);
			if (horizonCode) horizons.add(horizonCode);
		}
		return horizons.size / HORIZON_ORDER.length;
	});
	let otSourceRow = $derived.by(
		() =>
			[...filteredSourceRows]
				.filter((row) => asString(row.horizon_code) === 'OT')
				.sort(
					(a, b) =>
						(asBoolean(b.ot_available_flag) === true ? 1 : 0) -
						(asBoolean(a.ot_available_flag) === true ? 1 : 0)
				)
				.at(0) ?? null
	);
	let otReady = $derived.by(() => asBoolean(otSourceRow?.ot_available_flag) === true);

	let documentLandscape = $derived.by(() =>
		HORIZON_ORDER.map((horizonCode) => ({
			horizonCode,
			label: horizonLabel(horizonCode),
			documents: filteredDocumentRows.filter((row) => asString(row.horizon_code) === horizonCode)
				.length,
			facts: filteredMetricRows.filter((row) => asString(row.horizon_code) === horizonCode).length,
			sources: filteredSourceRows.filter((row) => asString(row.horizon_code) === horizonCode).length
		}))
	);

	let bscScopeRows = $derived.by(() => {
		const byScope = new Map<
			string,
			{
				label: string;
				actualScores: number[];
				targetScores: number[];
				weightedScores: number[];
				kpiCount: number;
				gapCount: number;
			}
		>();

		for (const row of filteredBscRows) {
			const perspectiveName =
				asString(row.perspective_name) ?? asString(row.perspective_code) ?? 'Perspective';
			const scopeCode = asString(row.scope_code) ?? 'ALL';
			const key = `${perspectiveName}__${scopeCode}`;
			const current = byScope.get(key) ?? {
				label: `${perspectiveName} · ${scopeCode}`,
				actualScores: [],
				targetScores: [],
				weightedScores: [],
				kpiCount: 0,
				gapCount: 0
			};

			const actualScore = asNumber(row.actual_score);
			const targetScore = asNumber(row.target_score);
			const weightedScore = asNumber(row.weighted_actual_score);
			if (actualScore !== null) current.actualScores.push(actualScore);
			if (targetScore !== null) current.targetScores.push(targetScore);
			if (weightedScore !== null) current.weightedScores.push(weightedScore);
			current.kpiCount += asNumber(row.kpi_count) ?? 0;
			current.gapCount += asNumber(row.kpi_with_gap_count) ?? 0;
			byScope.set(key, current);
		}

		return Array.from(byScope.values())
			.map((row) => ({
				label: row.label,
				actualScore: average(row.actualScores),
				targetScore: average(row.targetScores),
				weightedActual: sum(row.weightedScores),
				kpiCount: row.kpiCount,
				gapCount: row.gapCount
			}))
			.sort(
				(a, b) => (b.actualScore ?? 0) - (a.actualScore ?? 0) || a.label.localeCompare(b.label)
			);
	});

	let gapRowsSorted = $derived.by(() =>
		[...filteredGapRows].sort(
			(a, b) =>
				Math.abs(asNumber(b.gap_pct) ?? 0) - Math.abs(asNumber(a.gap_pct) ?? 0) ||
				(asString(a.metric_name) ?? '').localeCompare(asString(b.metric_name) ?? '')
		)
	);

	let executiveRowsSorted = $derived.by(() =>
		[...filteredExecutiveRows].sort(
			(a, b) =>
				(asNumber(a.display_order) ?? 999) - (asNumber(b.display_order) ?? 999) ||
				(asString(a.executive_label) ?? '').localeCompare(asString(b.executive_label) ?? '')
		)
	);

	let sourceRowsSorted = $derived.by(() =>
		[...filteredSourceRows].sort((a, b) => {
			const horizonCompare = sortByHorizon(
				asString(a.horizon_code) ?? '',
				asString(b.horizon_code) ?? ''
			);
			if (horizonCompare !== 0) return horizonCompare;
			return (asNumber(b.record_count) ?? 0) - (asNumber(a.record_count) ?? 0);
		})
	);

	let selectedKpiEntry = $derived.by(
		() => kpiEntryRows.find((row) => row.selectionKey === selectedKpiSelectionKey) ?? null
	);
	let provenanceRows = $derived.by(() => (provenanceData?.rows ?? []) as DatasetRow[]);
	let provenanceRowsSorted = $derived.by(() =>
		[...provenanceRows].sort(
			(a, b) =>
				confidenceSortValue(confidenceLevel(a.extractability)) -
					confidenceSortValue(confidenceLevel(b.extractability)) ||
				sortByHorizon(asString(a.horizon_code) ?? '', asString(b.horizon_code) ?? '') ||
				(asString(a.document_name) ?? '').localeCompare(asString(b.document_name) ?? '') ||
				provenanceLocatorLabel(a).localeCompare(provenanceLocatorLabel(b))
		)
	);
	let provenanceDocumentRows = $derived.by(() => {
		const byDocument = new Map<
			string,
			{
				representative: DatasetRow;
				locators: Set<string>;
				recordSources: Set<string>;
			}
		>();

		for (const row of provenanceRowsSorted) {
			const key = documentIdentity(row);
			const current = byDocument.get(key) ?? {
				representative: row,
				locators: new Set<string>(),
				recordSources: new Set<string>()
			};

			if (metricRepresentativeRank(row) < metricRepresentativeRank(current.representative)) {
				current.representative = row;
			}

			current.locators.add(provenanceLocatorLabel(row));
			const recordSource = asString(row.record_source);
			if (recordSource) current.recordSources.add(recordSource);
			byDocument.set(key, current);
		}

		return Array.from(byDocument.values()).sort(
			(a, b) =>
				confidenceSortValue(confidenceLevel(a.representative.extractability)) -
					confidenceSortValue(confidenceLevel(b.representative.extractability)) ||
				sortByHorizon(
					asString(a.representative.horizon_code) ?? '',
					asString(b.representative.horizon_code) ?? ''
				) ||
				(asString(a.representative.document_name) ?? '').localeCompare(
					asString(b.representative.document_name) ?? ''
				)
		);
	});
	let selectedKpiDocumentCount = $derived.by(() => {
		if (provenanceDocumentRows.length) {
			return provenanceDocumentRows.length;
		}
		return selectedKpiEntry?.documentCount ?? 0;
	});

	$effect(() => {
		if (!selectedKpiSelectionKey) {
			provenanceData = null;
			provenanceError = null;
			provenanceLoading = false;
			return;
		}

		const entry = selectedKpiEntry;
		if (!entry) {
			closeProvenancePanel();
			return;
		}

		void loadSelectedKpiProvenance(entry);
	});

	let documentLandscapeChartOptions = $derived.by((): EChartsOption | null => {
		if (!documentLandscape.some((row) => row.documents || row.facts || row.sources)) return null;

		return {
			tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
			legend: { top: 0 },
			grid: { top: 36, right: 18, bottom: 18, left: 18, containLabel: true },
			xAxis: {
				type: 'category',
				data: documentLandscape.map((row) => row.horizonCode)
			},
			yAxis: {
				type: 'value',
				minInterval: 1
			},
			series: [
				{
					name: 'Документы',
					type: 'bar',
					barMaxWidth: 32,
					data: documentLandscape.map((row) => row.documents)
				},
				{
					name: 'Факты',
					type: 'bar',
					barMaxWidth: 32,
					data: documentLandscape.map((row) => row.facts)
				},
				{
					name: 'Источники',
					type: 'line',
					smooth: true,
					data: documentLandscape.map((row) => row.sources)
				}
			]
		};
	});

	let bscChartOptions = $derived.by((): EChartsOption | null => {
		if (!bscScopeRows.length || !hasBscActuals) return null;

		const rows = [...bscScopeRows].slice(0, 8).reverse();
		return {
			tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
			legend: { top: 0 },
			grid: { top: 32, left: 16, right: 16, bottom: 16, containLabel: true },
			xAxis: {
				type: 'value',
				max: 120,
				axisLabel: { formatter: '{value}%' }
			},
			yAxis: {
				type: 'category',
				data: rows.map((row) => truncate(row.label, 24))
			},
			series: [
				{
					name: 'Целевой балл',
					type: 'bar',
					barMaxWidth: 20,
					data: rows.map((row) => (row.targetScore ?? 0) * 100)
				},
				{
					name: 'Фактический балл',
					type: 'bar',
					barMaxWidth: 20,
					data: rows.map((row) => (row.actualScore ?? 0) * 100)
				}
			]
		};
	});

	let gapChartOptions = $derived.by((): EChartsOption | null => {
		if (!gapRowsSorted.length) return null;

		const rows = [...gapRowsSorted].slice(0, 8).reverse();
		return {
			tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
			legend: { top: 0 },
			grid: { top: 32, left: 16, right: 16, bottom: 16, containLabel: true },
			xAxis: {
				type: 'value'
			},
			yAxis: {
				type: 'category',
				data: rows.map((row) =>
					truncate(asString(row.metric_name) ?? asString(row.metric_code) ?? 'Metric', 26)
				)
			},
			series: [
				{
					name: 'Цель (родительский)',
					type: 'bar',
					barMaxWidth: 18,
					data: rows.map((row) => asNumber(row.parent_target_value) ?? 0)
				},
				{
					name: 'Итого дочерних',
					type: 'bar',
					barMaxWidth: 18,
					data: rows.map((row) => asNumber(row.child_rollup_target) ?? 0)
				}
			]
		};
	});

	let sourceCoverageChartOptions = $derived.by((): EChartsOption | null => {
		if (!sourceRowsSorted.length) return null;

		const rows = [...sourceRowsSorted].slice(0, 10).reverse();
		return {
			tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
			legend: { top: 0 },
			grid: { top: 32, left: 16, right: 16, bottom: 16, containLabel: true },
			xAxis: {
				type: 'value',
				minInterval: 1
			},
			yAxis: {
				type: 'category',
				data: rows.map((row) =>
					truncate(
						`${asString(row.horizon_code) ?? '\u2014'} · ${asString(row.source_code) ?? '\u2014'}`,
						24
					)
				)
			},
			series: [
				{
					name: 'Высокая',
					type: 'bar',
					stack: 'confidence',
					barMaxWidth: 18,
					data: rows.map((row) => asNumber(row.high_confidence_count) ?? 0)
				},
				{
					name: 'Средняя',
					type: 'bar',
					stack: 'confidence',
					barMaxWidth: 18,
					data: rows.map((row) => asNumber(row.medium_confidence_count) ?? 0)
				},
				{
					name: 'Низкая',
					type: 'bar',
					stack: 'confidence',
					barMaxWidth: 18,
					data: rows.map((row) => asNumber(row.low_confidence_count) ?? 0)
				}
			]
		};
	});

	function chainStepExists(row: DatasetRow, stepIndex: number): boolean {
		if (stepIndex === 0) return true;
		if (stepIndex === 1) return asBoolean(row.lt_mt_exists) === true;
		if (stepIndex === 2) return asBoolean(row.mt_st_exists) === true;
		return asBoolean(row.st_ot_exists) === true;
	}

	const chainSteps = ['LT', 'MT', 'ST', 'OT'];
</script>

<svelte:head>
	<title>Стратегический анализ</title>
</svelte:head>

<div class="space-y-6 p-6 pb-12">
	<!-- ═══════════════════════════════════════════════════════════
	     HEADER: title, meta, filters, key stats
	     ═══════════════════════════════════════════════════════════ -->
	<Card
		class="overflow-hidden border-border/80 bg-[linear-gradient(135deg,rgba(59,130,246,0.06),transparent_50%),linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.98))]"
	>
		<CardHeader class="gap-4">
			<div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
				<div class="max-w-3xl space-y-3">
					<div class="flex flex-wrap items-center gap-2">
						<Badge variant={otReady ? 'success' : 'warning'}>
							{otReady ? 'OT подключен' : 'OT не готов'}
						</Badge>
						{#if hasLoadedAnyData}
							<Badge variant="outline">{executiveCuratedCount} KPI</Badge>
						{:else}
							<Badge variant="muted">Загрузка…</Badge>
						{/if}
						{#if latestLoadedAt}
							<Badge variant="muted">Обновлено {latestLoadedAt}</Badge>
						{/if}
					</div>

					<div>
						<h1 class="type-page-title text-foreground">Стратегический анализ</h1>
						<p class="type-body-sm mt-1.5 max-w-2xl text-muted-foreground">
							Balanced scorecard, каскад целей LT→MT→ST→OT, покрытие источников и анализ
							расхождений.
						</p>
					</div>
				</div>

				<div class="flex flex-wrap gap-4 xl:justify-end">
					{#if hasLoadedAnyData}
						<ProgressCircle
							value={(averageCascadeCoverage ?? 0) * 100}
							variant="auto"
							label="Покрытие каскада"
							size="default"
						/>
						{#if averageBscScore !== null}
							<ProgressCircle
								value={averageBscScore * 100}
								variant="auto"
								label="Оценка BSC"
								size="default"
							/>
						{:else}
							<div
								class="flex min-h-[96px] min-w-[96px] flex-col items-center justify-center rounded-full border border-border/70 bg-background/80 px-3 text-center"
							>
								<div class="text-xs tracking-[0.14em] text-muted-foreground uppercase">
									Оценка BSC
								</div>
								<div class="mt-1 text-sm font-medium text-foreground">Нет данных</div>
							</div>
						{/if}
					{:else}
						<div
							class="flex min-h-[96px] min-w-[96px] flex-col items-center justify-center rounded-full border border-border/70 bg-background/80 px-3 text-center"
						>
							<div class="text-xs tracking-[0.14em] text-muted-foreground uppercase">Загрузка</div>
							<div class="mt-1 text-sm font-medium text-foreground">…</div>
						</div>
					{/if}
				</div>
			</div>
		</CardHeader>

		<CardContent class="space-y-5">
			<div class="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
				<div class="space-y-1.5">
					<label class="type-caption text-muted-foreground" for="strategy-department"
						>Подразделение</label
					>
					<Select id="strategy-department" bind:value={selectedDepartment}>
						<option value="all">Все</option>
						{#each departmentOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</Select>
				</div>

				<div class="space-y-1.5">
					<label class="type-caption text-muted-foreground" for="strategy-horizon">Горизонт</label>
					<Select id="strategy-horizon" bind:value={selectedHorizon}>
						<option value="all">Все</option>
						{#each horizonOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</Select>
				</div>

				<div class="space-y-1.5">
					<label class="type-caption text-muted-foreground" for="strategy-perspective"
						>Перспектива BSC</label
					>
					<Select id="strategy-perspective" bind:value={selectedPerspective}>
						<option value="all">Все</option>
						{#each perspectiveOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</Select>
				</div>

				<div class="space-y-1.5">
					<label class="type-caption text-muted-foreground" for="strategy-record-source"
						>Слой фактов</label
					>
					<Select id="strategy-record-source" bind:value={selectedRecordSource}>
						<option value="all">Все</option>
						{#each recordSourceOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</Select>
				</div>

				<div class="flex flex-wrap items-end gap-2">
					<Button
						variant={gapOnly ? 'default' : 'outline'}
						size="sm"
						onclick={() => {
							gapOnly = !gapOnly;
						}}
					>
						{gapOnly ? 'Все показатели' : 'Только разрывы'}
					</Button>
					<Button variant="ghost" size="sm" onclick={resetFilters}>Сбросить</Button>
					<Button onclick={reload} {loading} variant="outline" size="sm">
						{loading ? 'Загрузка…' : 'Обновить'}
					</Button>
				</div>
			</div>
		</CardContent>
	</Card>

	{#if error}
		<div class="rounded-lg border border-error/30 bg-error-muted p-4 text-sm text-error">
			{error}
		</div>
	{/if}

	<!-- ═══════════════════════════════════════════════════════════
	     TAB NAVIGATION
	     ═══════════════════════════════════════════════════════════ -->
	<nav class="flex gap-1 border-b border-border">
		{#each TABS as tab}
			<button
				class={`-mb-px border-b-2 px-5 py-2.5 text-sm font-medium transition-colors ${
					activeTab === tab.id
						? 'border-primary text-primary'
						: 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
				}`}
				onclick={() => {
					activeTab = tab.id;
				}}
			>
				{tab.label}
			</button>
		{/each}
	</nav>

	<!-- ═══════════════════════════════════════════════════════════
	     TAB 1: ОБЗОР (Executive View)
	     ═══════════════════════════════════════════════════════════ -->
	{#if activeTab === 'overview'}
		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			<StatCard
				label="Оценка BSC"
				value={formatRatio(averageBscScore, 1)}
				loading={loading && !bscData}
			/>
			<StatCard
				label="Покрытие каскада"
				value={formatRatio(averageCascadeCoverage, 1)}
				loading={loading && !cascadeData}
			/>
			<StatCard
				label="Покрытие горизонтов"
				value={formatRatio(horizonCoverage, 0)}
				loading={loading && !sourceData}
			/>
			<StatCard
				label="KPI с разрывами"
				value={String(kpiWithGapCount)}
				loading={loading && !bscData}
			/>
		</div>

		<!-- Executive KPI cards -->
		<Card>
			<CardHeader>
				<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
					<div>
						<CardTitle>Ключевые KPI</CardTitle>
						<CardDescription>
							Закрепленные KPI-цепочки для руководства. Нажмите на карточку для детализации.
						</CardDescription>
					</div>
					<div class="flex flex-wrap items-center gap-2">
						<Badge variant="success">Для руководства</Badge>
						<Badge variant="outline">{executiveCuratedCount} KPI</Badge>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{#if executiveRowsSorted.length}
					<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
						{#each executiveRowsSorted as row}
							<button
								class="cursor-pointer rounded-xl border border-border/70 bg-background/70 p-5 text-left transition-all hover:border-primary/30 hover:shadow-md"
								onclick={drillToGaps}
							>
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div>
										<div class="font-medium text-foreground">
											{formatCell(row.executive_label)}
										</div>
										<div class="mt-1 text-sm text-muted-foreground">
											{formatCell(row.metric_code)} · {formatCell(row.department_code)}
										</div>
									</div>
									<Badge variant={readinessVariant(asString(row.readiness_status))}>
										{formatCell(row.readiness_status)}
									</Badge>
								</div>

								<div class="mt-4 text-3xl font-semibold tracking-tight text-foreground">
									{executiveMetricDisplayValue(row)}
								</div>
								<div class="mt-1 text-sm text-muted-foreground">
									{horizonLabel(asString(row.display_horizon_code))}
									{#if asString(row.display_period_key)}
										· {formatCell(row.display_period_key)}
									{/if}
								</div>

								<div class="mt-4 grid gap-3 sm:grid-cols-2">
									<div class="rounded-lg border border-border/60 p-3">
										<div class="text-xs tracking-[0.14em] text-muted-foreground uppercase">
											Числовой разрыв
										</div>
										<div class="mt-1 flex items-center gap-2">
											<Badge variant={statusBadgeVariant(asString(row.numeric_gap_status))}>
												{formatCell(row.numeric_gap_status)}
											</Badge>
										</div>
										<div class="mt-2 text-sm text-muted-foreground">
											{formatSignedRatio(asNumber(row.numeric_gap_pct), 1)}
										</div>
									</div>

									<div class="rounded-lg border border-border/60 p-3">
										<div class="text-xs tracking-[0.14em] text-muted-foreground uppercase">
											Покрытие подразд.
										</div>
										<div class="mt-2 text-sm font-medium text-foreground">
											{formatRatio(asNumber(row.department_coverage_pct), 1)}
										</div>
										<div class="mt-2">
											<ProgressBar
												value={(asNumber(row.department_coverage_pct) ?? 0) * 100}
												variant={progressVariant(asNumber(row.department_coverage_pct))}
											/>
										</div>
									</div>
								</div>

								<div class="mt-4 flex flex-wrap items-center gap-2">
									<Badge variant="outline">{formatCell(row.dashboard_group)}</Badge>
									<Badge variant="muted">{formatCell(row.horizons_present)}</Badge>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<div class="text-sm text-muted-foreground">Ключевые KPI не попали в текущий фильтр.</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Coverage Snapshot -->
		<Card>
			<CardHeader>
				<CardTitle>Сводка покрытия</CardTitle>
				<CardDescription>Каскад целей, оценка BSC и готовность операционного слоя</CardDescription>
			</CardHeader>
			<CardContent class="space-y-5">
				<div class="grid gap-6 md:grid-cols-3">
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<span class="type-caption text-muted-foreground">Покрытие каскада</span>
							<span class="type-caption-strong text-foreground"
								>{formatRatio(averageCascadeCoverage, 1)}</span
							>
						</div>
						<ProgressBar
							value={(averageCascadeCoverage ?? 0) * 100}
							variant={progressVariant(averageCascadeCoverage)}
						/>
					</div>

					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<span class="type-caption text-muted-foreground">Оценка BSC</span>
							<span class="type-caption-strong text-foreground"
								>{formatRatio(averageBscScore, 1)}</span
							>
						</div>
						{#if averageBscScore !== null}
							<ProgressBar
								value={averageBscScore * 100}
								variant={progressVariant(averageBscScore)}
							/>
						{:else}
							<div class="text-sm text-muted-foreground">
								Операционные actual-значения еще не загружены.
							</div>
						{/if}
					</div>

					<div class="rounded-lg border border-border/70 bg-muted/20 p-4">
						<div class="flex items-center justify-between gap-3">
							<div>
								<p class="type-caption text-muted-foreground">Операционный слой (OT)</p>
								<p class="mt-1 text-sm text-foreground">
									{otSourceRow ? (asString(otSourceRow.source_code) ?? '\u2014') : '\u2014'}
								</p>
							</div>
							<Badge variant={otReady ? 'success' : 'warning'}>
								{otReady ? 'Готов' : 'Нет источника'}
							</Badge>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- ═══════════════════════════════════════════════════════════
	     TAB 2: КАСКАД И РАЗРЫВЫ
	     ═══════════════════════════════════════════════════════════ -->
	{:else if activeTab === 'cascade'}
		<div class="grid gap-4 xl:grid-cols-2">
			<ChartCard
				title="Balanced Scorecard"
				subtitle="Фактические и целевые баллы по перспективам BSC"
				loading={loading && !bscData}
			>
				{#if bscChartOptions}
					<Chart options={bscChartOptions} class="min-h-[340px]" />
				{:else}
					<div class="flex h-full items-center justify-center text-sm text-muted-foreground">
						Нет фактических BSC-данных. Целевые KPI загружены, но слой исполнения ещe неполный.
					</div>
				{/if}
			</ChartCard>

			<ChartCard
				title="Числовые расхождения"
				subtitle="Сопоставление целевых значений и итого дочерних"
				loading={loading && !gapData}
			>
				{#if gapChartOptions}
					<Chart options={gapChartOptions} class="min-h-[340px]" />
				{:else}
					<div class="flex h-full items-center justify-center text-sm text-muted-foreground">
						Нет рассчитанных расхождений.
					</div>
				{/if}
			</ChartCard>
		</div>

		<!-- Planning Cascade -->
		<Card>
			<CardHeader>
				<CardTitle>Каскад планирования</CardTitle>
				<CardDescription>
					Цепочка целей LT→MT→ST→OT — где рвется связь между горизонтами
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if filteredCascadeRows.length}
					{#each filteredCascadeRows as row}
						<div class="rounded-xl border border-border/70 p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div>
									<div class="font-medium text-foreground">{formatCell(row.chain_id)}</div>
									<div class="mt-1 text-sm text-muted-foreground">
										{formatCell(row.cascade_subject)}
									</div>
								</div>
								<Badge variant={statusBadgeVariant(asString(row.coverage_status))}>
									{formatCell(row.coverage_status)}
								</Badge>
							</div>

							<div class="mt-4 flex flex-wrap items-center gap-2 lg:flex-nowrap">
								{#each chainSteps as step, index}
									<div class="flex items-center gap-2">
										<div
											class={`flex h-12 w-20 items-center justify-center rounded-lg border text-sm font-medium ${
												chainStepExists(row, index)
													? 'border-success/30 bg-success-muted text-success'
													: 'border-error/30 bg-error-muted text-error'
											}`}
										>
											{step}
										</div>
										{#if index < chainSteps.length - 1}
											<div
												class={`h-[2px] w-10 ${
													chainStepExists(row, index + 1) ? 'bg-success/50' : 'bg-error/50'
												}`}
											></div>
										{/if}
									</div>
								{/each}
							</div>

							<div class="mt-4 space-y-2">
								<div class="flex items-center justify-between text-sm">
									<span class="text-muted-foreground">Покрытие</span>
									<span class="font-medium text-foreground">
										{formatRatio(asNumber(row.coverage_pct), 1)}
									</span>
								</div>
								<ProgressBar
									value={(asNumber(row.coverage_pct) ?? 0) * 100}
									variant={progressVariant(asNumber(row.coverage_pct))}
								/>
							</div>

							{#if asString(row.missing_transitions)}
								<div
									class="mt-4 rounded-lg border border-error/20 bg-error-muted p-3 text-sm text-error"
								>
									Разрыв: {formatCell(row.missing_transitions)}
								</div>
							{/if}
						</div>
					{/each}
				{:else}
					<div class="text-sm text-muted-foreground">Нет данных каскада.</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Priority Gaps table -->
		<Card>
			<CardHeader>
				<CardTitle>Приоритетные разрывы</CardTitle>
				<CardDescription>
					Ключевые расхождения между верхнеуровневым KPI и итого дочерних значений
				</CardDescription>
			</CardHeader>
			<CardContent class="overflow-x-auto">
				{#if gapRowsSorted.length}
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-border text-left text-muted-foreground">
								<th class="px-3 py-2">Метрика</th>
								<th class="px-3 py-2">Документ</th>
								<th class="px-3 py-2 text-right">Цель</th>
								<th class="px-3 py-2 text-right">Итого</th>
								<th class="px-3 py-2 text-right">Разрыв</th>
								<th class="px-3 py-2 text-right">Статус</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border/60">
							{#each gapRowsSorted as row}
								<tr>
									<td class="px-3 py-2">
										<div class="font-medium text-foreground">
											{formatCell(row.metric_name)}
										</div>
										<div class="text-muted-foreground">{formatCell(row.metric_code)}</div>
									</td>
									<td class="px-3 py-2">
										<div>{formatCell(row.parent_document_name)}</div>
										<div class="text-muted-foreground">
											{horizonLabel(asString(row.parent_horizon_code))}
										</div>
									</td>
									<td class="px-3 py-2 text-right">{formatCell(row.parent_target_value)}</td>
									<td class="px-3 py-2 text-right">{formatCell(row.child_rollup_target)}</td>
									<td class="px-3 py-2 text-right">
										{formatSignedRatio(asNumber(row.gap_pct), 1)}
									</td>
									<td class="px-3 py-2 text-right">
										<Badge variant={statusBadgeVariant(asString(row.gap_status))}>
											{formatCell(row.gap_status)}
										</Badge>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{:else}
					<div class="text-sm text-muted-foreground">Нет расхождений для выбранного фильтра.</div>
				{/if}
			</CardContent>
		</Card>

		<!-- ═══════════════════════════════════════════════════════════
	     TAB 3: КАЧЕСТВО ДАННЫХ
	     ═══════════════════════════════════════════════════════════ -->
	{:else}
		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
			<StatCard
				label="Документы"
				value={String(documentCount)}
				loading={loading && !documentsData}
			/>
			<StatCard label="Строки фактов" value={String(factCount)} loading={loading && !metricData} />
			<StatCard
				label="Авто-извлечение"
				value={String(autoExtractCount)}
				loading={loading && !metricData}
			/>
			<StatCard
				label="Числовые разрывы"
				value={String(numericGapCount)}
				loading={loading && !gapData}
			/>
			<StatCard
				label="Структурные разрывы"
				value={String(structuralGapCount)}
				loading={loading && !cascadeData}
			/>
		</div>

		<div class="grid gap-4 xl:grid-cols-2">
			<ChartCard
				title="Охват планирования"
				subtitle="Документы, факты и источники по каждому горизонту"
				loading={loading && !metricData}
			>
				{#if documentLandscapeChartOptions}
					<Chart options={documentLandscapeChartOptions} class="min-h-[320px]" />
				{:else}
					<div class="flex h-full items-center justify-center text-sm text-muted-foreground">
						Нет данных для горизонтов.
					</div>
				{/if}
			</ChartCard>

			<ChartCard
				title="Достоверность источников"
				subtitle="Покрытие источников по горизонтам и уровням достоверности"
				loading={loading && !sourceData}
			>
				{#if sourceCoverageChartOptions}
					<Chart options={sourceCoverageChartOptions} class="min-h-[320px]" />
				{:else}
					<div class="flex h-full items-center justify-center text-sm text-muted-foreground">
						Нет данных по покрытию источников.
					</div>
				{/if}
			</ChartCard>
		</div>

		<!-- KPI Evidence Entry + Panel -->
		<div class="grid gap-4 xl:grid-cols-[1fr_1fr]">
			<Card>
				<CardHeader>
					<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
						<div>
							<CardTitle>Обоснование KPI</CardTitle>
							<CardDescription>Выберите KPI, чтобы увидеть документы-основания</CardDescription>
						</div>
						<div class="flex flex-wrap items-center gap-2">
							<Badge variant="outline">{kpiEntryCount} KPI</Badge>
							<Badge variant="muted"
								>{selectedRecordSource === 'all'
									? 'Все слои'
									: recordSourceLabel(selectedRecordSource)}</Badge
							>
						</div>
					</div>
				</CardHeader>
				<CardContent class="overflow-x-auto">
					{#if kpiEntryRows.length}
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b border-border text-left text-muted-foreground">
									<th class="px-3 py-2">KPI</th>
									<th class="px-3 py-2">Контекст</th>
									<th class="px-3 py-2 text-right">Данные</th>
									<th class="px-3 py-2 text-right"></th>
								</tr>
							</thead>
							<tbody class="divide-y divide-border/60">
								{#each kpiEntryRows as row}
									<tr
										class={`transition-colors ${
											selectedKpiSelectionKey === row.selectionKey ? 'bg-primary/5' : ''
										}`}
									>
										<td class="px-3 py-2">
											<div class="font-medium text-foreground">
												{row.metricName ?? row.metricCode ?? '\u2014'}
											</div>
											<div class="text-muted-foreground">{row.metricCode ?? '\u2014'}</div>
											<div class="mt-1 text-xs text-muted-foreground">
												{metricDisplayValue(row.representative)}
											</div>
										</td>
										<td class="px-3 py-2">
											<div class="font-medium text-foreground">
												{horizonLabel(row.horizonCode)}
												{#if row.periodKey}
													· {row.periodKey}
												{/if}
											</div>
											<div class="text-muted-foreground">
												{row.chainId ?? '\u2014'} · {row.departmentCode ?? '\u2014'}
											</div>
											<div class="mt-1 text-xs text-muted-foreground">
												{row.recordSources.map((source) => recordSourceLabel(source)).join(', ') ||
													'\u2014'}
											</div>
										</td>
										<td class="px-3 py-2 text-right">
											<div class="flex items-center justify-end gap-2">
												<Badge variant="outline">{row.documentCount} док.</Badge>
												<Badge variant={confidenceVariant(row.confidence)}
													>{row.confidence ?? 'n/a'}</Badge
												>
											</div>
										</td>
										<td class="px-3 py-2 text-right">
											<Button
												variant={selectedKpiSelectionKey === row.selectionKey
													? 'default'
													: 'outline'}
												size="sm"
												onclick={() => {
													selectedKpiSelectionKey = row.selectionKey;
												}}
											>
												{selectedKpiSelectionKey === row.selectionKey ? 'Выбран' : 'Открыть'}
											</Button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					{:else}
						<div class="text-sm text-muted-foreground">KPI для обоснования не найдены.</div>
					{/if}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
						<div>
							<CardTitle>Панель документов</CardTitle>
							<CardDescription>Документы и локаторы для выбранного KPI</CardDescription>
						</div>
						{#if selectedKpiEntry}
							<Button variant="ghost" size="sm" onclick={closeProvenancePanel}>Закрыть</Button>
						{/if}
					</div>
				</CardHeader>
				<CardContent class="space-y-4">
					{#if selectedKpiEntry}
						<div class="rounded-xl border border-border/70 bg-background/70 p-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div>
									<div class="font-medium text-foreground">
										{selectedKpiEntry.metricName ?? selectedKpiEntry.metricCode ?? '\u2014'}
									</div>
									<div class="mt-1 text-sm text-muted-foreground">
										{selectedKpiEntry.metricCode ?? '\u2014'} · {selectedKpiEntry.chainId ??
											'\u2014'}
									</div>
								</div>
								<div class="text-right">
									<div class="text-2xl font-semibold tracking-tight text-foreground">
										{metricDisplayValue(selectedKpiEntry.representative)}
									</div>
									<div class="mt-1 text-xs text-muted-foreground">
										{selectedKpiEntry.periodKey ?? '\u2014'}
									</div>
								</div>
							</div>

							<div class="mt-4 flex flex-wrap items-center gap-2">
								<Badge variant="outline">{horizonLabel(selectedKpiEntry.horizonCode)}</Badge>
								<Badge variant="outline">{selectedKpiDocumentCount} док.</Badge>
								<Badge variant="muted">{selectedKpiEntry.evidenceCount} свидет.</Badge>
								<Badge variant={confidenceVariant(selectedKpiEntry.confidence)}>
									{selectedKpiEntry.confidence ?? 'n/a'}
								</Badge>
							</div>
							<div class="mt-3 text-sm text-muted-foreground">
								Фактовые слои: {selectedKpiEntry.recordSources
									.map((source) => recordSourceLabel(source))
									.join(', ') || '\u2014'}
							</div>
						</div>

						{#if provenanceError}
							<div class="rounded-lg border border-error/30 bg-error-muted p-4 text-sm text-error">
								{provenanceError}
							</div>
						{:else if provenanceLoading && !provenanceRowsSorted.length}
							<div class="text-sm text-muted-foreground">Загружаю документы-основания…</div>
						{:else if provenanceDocumentRows.length}
							<div class="space-y-3">
								{#each provenanceDocumentRows as item}
									<div class="rounded-xl border border-border/70 p-4">
										<div class="flex flex-wrap items-start justify-between gap-3">
											<div>
												<div class="font-medium text-foreground">
													{formatCell(item.representative.document_name)}
												</div>
												<div class="mt-1 text-sm text-muted-foreground">
													{formatCell(item.representative.document_code)} · {horizonLabel(
														asString(item.representative.horizon_code)
													)}
												</div>
											</div>
											<div class="flex flex-wrap items-center gap-2">
												<Badge
													variant={confidenceVariant(
														confidenceLevel(item.representative.extractability)
													)}
												>
													{formatCell(item.representative.extractability)}
												</Badge>
												<Badge variant="outline">
													{Array.from(item.recordSources.values())
														.map((source) => recordSourceLabel(source))
														.join(', ')}
												</Badge>
											</div>
										</div>

										<div class="mt-3 grid gap-2 text-sm text-muted-foreground">
											<div>Локатор: {Array.from(item.locators.values()).join(' · ')}</div>
											<div>
												Путь: {truncate(formatCell(item.representative.document_file), 120)}
											</div>
										</div>

										<div class="mt-4 flex flex-wrap items-center gap-2">
											<Button
												variant="outline"
												size="sm"
												disabled={!asString(item.representative.document_url)}
												onclick={() => {
													const url = asString(item.representative.document_url);
													if (url) {
														window.open(url, '_blank', 'noopener,noreferrer');
													}
												}}
											>
												Открыть документ
											</Button>
											{#if !asString(item.representative.document_url)}
												<span class="text-xs text-muted-foreground">
													STRATEGY_DOCUMENT_BASE_URL не настроен
												</span>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<div class="text-sm text-muted-foreground">
								Для выбранного KPI нет строк обоснования в текущем фильтре.
							</div>
						{/if}
					{:else}
						<div
							class="rounded-lg border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground"
						>
							Выберите KPI слева, чтобы увидеть документы-основания.
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>

		<!-- Source Table -->
		<Card>
			<CardHeader>
				<CardTitle>Таблица источников</CardTitle>
				<CardDescription>
					Контроль источников LT / MT / ST / OT — достоверность и готовность OT
				</CardDescription>
			</CardHeader>
			<CardContent class="overflow-x-auto">
				{#if sourceRowsSorted.length}
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-border text-left text-muted-foreground">
								<th class="px-3 py-2">Источник</th>
								<th class="px-3 py-2">Горизонт</th>
								<th class="px-3 py-2 text-right">Строк</th>
								<th class="px-3 py-2 text-right">Достоверность</th>
								<th class="px-3 py-2 text-right">OT</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-border/60">
							{#each sourceRowsSorted as row}
								<tr>
									<td class="px-3 py-2">
										<div class="font-medium text-foreground">
											{formatCell(row.source_code)}
										</div>
										<div class="text-muted-foreground">
											{recordSourceLabel(asString(row.record_source))}
										</div>
									</td>
									<td class="px-3 py-2">{horizonLabel(asString(row.horizon_code))}</td>
									<td class="px-3 py-2 text-right">{formatCell(row.record_count)}</td>
									<td class="px-3 py-2 text-right">
										<div class="flex items-center justify-end gap-1.5">
											<Badge variant="success" size="sm"
												>{formatCell(row.high_confidence_count)}</Badge
											>
											<Badge variant="warning" size="sm"
												>{formatCell(row.medium_confidence_count)}</Badge
											>
											<Badge variant="error" size="sm">{formatCell(row.low_confidence_count)}</Badge
											>
										</div>
									</td>
									<td class="px-3 py-2 text-right">
										<Badge variant={asBoolean(row.ot_available_flag) ? 'success' : 'warning'}>
											{asBoolean(row.ot_available_flag) ? 'Готов' : 'Нет'}
										</Badge>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{:else}
					<div class="text-sm text-muted-foreground">Нет строк покрытия источников.</div>
				{/if}
			</CardContent>
		</Card>
	{/if}
</div>
