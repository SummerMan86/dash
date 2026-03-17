<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	import type { EmisMapSelectedFeature } from '$entities/emis-map';
	import type { EmisNewsSummary } from '$entities/emis-news';
	import type { EmisObjectSummary } from '$entities/emis-object';
	import { useFilterWorkspace } from '$entities/filter';
	import { fetchDataset } from '$shared/api/fetchDataset';
	import { useDebouncedLoader } from '$shared/lib/useDebouncedLoader.svelte';
	import { Button } from '$shared/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$shared/ui/card';
	import { Select } from '$shared/ui/select';
	import { FilterPanel } from '$widgets/filters';
	import { EmisMap } from '$widgets/emis-map';

	import { emisWorkspaceFilters, EMIS_FILTER_TARGETS } from './filters';

	type SearchResultKind = 'objects' | 'news';
	type ShipRoutePointRow = {
		routePointId: number;
		shipHbkId: number;
		shipId: number | null;
		imo: number | null;
		mmsi: number | null;
		vesselName: string;
		vesselType: string | null;
		flag: string | null;
		callsign: string | null;
		routeDateUtc: string | null;
		pointSeqShip: number;
		pointSeqDay: number | null;
		fetchedAt: string;
		loadedAt: string | null;
		latitude: number;
		longitude: number;
		speed: number | null;
		course: number | null;
		heading: number | null;
		gapMinutesFromPrev: number | null;
		gapMinutesToNext: number | null;
	};
	type ShipRouteSegmentRow = {
		shipHbkId: number;
		shipId: number | null;
		imo: number | null;
		mmsi: number | null;
		vesselName: string;
		vesselType: string | null;
		flag: string | null;
		callsign: string | null;
		segmentSeqShip: number;
		routeDateUtc: string | null;
		fromRoutePointId: number | null;
		toRoutePointId: number | null;
		fromFetchedAt: string;
		toFetchedAt: string | null;
		fromLatitude: number;
		fromLongitude: number;
		toLatitude: number;
		toLongitude: number;
		fromSpeed: number | null;
		fromCourse: number | null;
		fromHeading: number | null;
		gapMinutes: number | null;
		sameCoordinatesAsNext: boolean | null;
	};
	type ShipRouteVesselOption = {
		shipHbkId: string;
		vesselName: string;
		latestFetchedAt: string;
		routeDateUtc: string | null;
		pointsCount: number;
		imo: number | null;
		mmsi: number | null;
	};

	let { data }: { data: PageData } = $props();

	const filterRuntime = useFilterWorkspace({
		workspaceId: 'emis',
		ownerId: 'workspace',
		specs: emisWorkspaceFilters
	});
	let effectiveFilters = $derived(filterRuntime.effective);

	let resultKind = $state<SearchResultKind>('objects');
	let objectRows = $state<EmisObjectSummary[]>([]);
	let newsRows = $state<EmisNewsSummary[]>([]);
	let resultsError = $state<string | null>(null);
	let resultsMeta = $state<{ count: number } | null>(null);
	let selectedFeature = $state<EmisMapSelectedFeature | null>(null);
	let selectionFilterSnapshot = $state<string | null>(null);
	let shipRouteCatalog = $state<ShipRouteVesselOption[]>([]);
	let selectedShipHbkId = $state('');
	let shipRoutePoints = $state<ShipRoutePointRow[]>([]);
	let shipRouteSegments = $state<ShipRouteSegmentRow[]>([]);
	let shipRouteCatalogLoading = $state(false);
	let shipRouteCatalogError = $state<string | null>(null);
	let shipRouteError = $state<string | null>(null);

	const assetChecklist = [
		{ key: 'pmtiles', label: '.pmtiles archive', ready: data.mapConfig.offlineAssets.pmtiles },
		{ key: 'sprites', label: 'sprites', ready: data.mapConfig.offlineAssets.sprites },
		{ key: 'fonts', label: 'fonts', ready: data.mapConfig.offlineAssets.fonts },
		{ key: 'manifest', label: 'manifest.json', ready: data.mapConfig.offlineAssets.manifest }
	];

	function toneClass(ready: boolean) {
		return ready
			? 'border-success/30 bg-success-muted/50 text-success-muted-foreground'
			: 'border-warning/30 bg-warning-muted/40 text-warning-muted-foreground';
	}

	function appendQueryParams(url: URL, params: Record<string, unknown>) {
		for (const [key, value] of Object.entries(params)) {
			if (value === null || value === undefined) continue;
			if (Array.isArray(value)) {
				for (const item of value) {
					url.searchParams.append(key, String(item));
				}
				continue;
			}

			url.searchParams.set(key, String(value));
		}
	}

	function formatDate(value: string) {
		return new Date(value).toLocaleString('ru-RU');
	}

	function asNumber(value: unknown): number | null {
		if (typeof value === 'number' && Number.isFinite(value)) return value;
		if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
			return Number(value);
		}
		return null;
	}

	function asString(value: unknown): string | null {
		if (typeof value !== 'string') return null;
		const trimmed = value.trim();
		return trimmed ? trimmed : null;
	}

	function asBoolean(value: unknown): boolean | null {
		if (typeof value === 'boolean') return value;
		return null;
	}

	function formatCoordinate(value: number) {
		return value.toFixed(4);
	}

	function formatMetric(value: number | null, suffix = '') {
		if (value === null) return 'n/a';
		return `${value.toFixed(1)}${suffix}`;
	}

	function parseShipRoutePoint(row: Record<string, unknown>): ShipRoutePointRow | null {
		const routePointId = asNumber(row.route_point_id);
		const shipHbkId = asNumber(row.ship_hbk_id);
		const pointSeqShip = asNumber(row.point_seq_ship);
		const latitude = asNumber(row.latitude);
		const longitude = asNumber(row.longitude);
		const fetchedAt = asString(row.fetched_at);

		if (
			routePointId === null ||
			shipHbkId === null ||
			pointSeqShip === null ||
			latitude === null ||
			longitude === null ||
			!fetchedAt
		) {
			return null;
		}

		return {
			routePointId,
			shipHbkId,
			shipId: asNumber(row.ship_id),
			imo: asNumber(row.imo),
			mmsi: asNumber(row.mmsi),
			vesselName: asString(row.vessel_name) ?? `Ship ${shipHbkId}`,
			vesselType: asString(row.vessel_type),
			flag: asString(row.flag),
			callsign: asString(row.callsign),
			routeDateUtc: asString(row.route_date_utc),
			pointSeqShip,
			pointSeqDay: asNumber(row.point_seq_day),
			fetchedAt,
			loadedAt: asString(row.loaded_at),
			latitude,
			longitude,
			speed: asNumber(row.speed),
			course: asNumber(row.course),
			heading: asNumber(row.heading),
			gapMinutesFromPrev: asNumber(row.gap_minutes_from_prev),
			gapMinutesToNext: asNumber(row.gap_minutes_to_next)
		};
	}

	function parseShipRouteSegment(row: Record<string, unknown>): ShipRouteSegmentRow | null {
		const shipHbkId = asNumber(row.ship_hbk_id);
		const segmentSeqShip = asNumber(row.segment_seq_ship);
		const fromFetchedAt = asString(row.from_fetched_at);
		const fromLatitude = asNumber(row.from_latitude);
		const fromLongitude = asNumber(row.from_longitude);
		const toLatitude = asNumber(row.to_latitude);
		const toLongitude = asNumber(row.to_longitude);

		if (
			shipHbkId === null ||
			segmentSeqShip === null ||
			!fromFetchedAt ||
			fromLatitude === null ||
			fromLongitude === null ||
			toLatitude === null ||
			toLongitude === null
		) {
			return null;
		}

		return {
			shipHbkId,
			shipId: asNumber(row.ship_id),
			imo: asNumber(row.imo),
			mmsi: asNumber(row.mmsi),
			vesselName: asString(row.vessel_name) ?? `Ship ${shipHbkId}`,
			vesselType: asString(row.vessel_type),
			flag: asString(row.flag),
			callsign: asString(row.callsign),
			segmentSeqShip,
			routeDateUtc: asString(row.route_date_utc),
			fromRoutePointId: asNumber(row.from_route_point_id),
			toRoutePointId: asNumber(row.to_route_point_id),
			fromFetchedAt,
			toFetchedAt: asString(row.to_fetched_at),
			fromLatitude,
			fromLongitude,
			toLatitude,
			toLongitude,
			fromSpeed: asNumber(row.from_speed),
			fromCourse: asNumber(row.from_course),
			fromHeading: asNumber(row.from_heading),
			gapMinutes: asNumber(row.gap_minutes),
			sameCoordinatesAsNext: asBoolean(row.same_coordinates_as_next)
		};
	}

	function buildObjectSubtitle(row: EmisObjectSummary) {
		const parts = [row.objectTypeName, row.region, row.countryCode].filter(Boolean);
		return parts.length ? parts.join(' • ') : null;
	}

	function buildNewsSubtitle(row: EmisNewsSummary) {
		const parts = [row.sourceName, row.newsType, row.region].filter(Boolean);
		return parts.length ? parts.join(' • ') : null;
	}

	let activeLayer = $derived.by((): 'all' | 'objects' | 'news' => {
		const raw = $effectiveFilters.layer;
		return raw === 'objects' || raw === 'news' ? raw : 'all';
	});
	let effectiveFilterSnapshot = $derived(JSON.stringify($effectiveFilters));
	let selectedFeatureRef = $derived(
		selectedFeature ? { id: selectedFeature.id, kind: selectedFeature.kind } : null
	);

	let mapObjectQuery = $derived.by(() => filterRuntime.getServerParams(EMIS_FILTER_TARGETS.mapObjects));
	let mapNewsQuery = $derived.by(() => filterRuntime.getServerParams(EMIS_FILTER_TARGETS.mapNews));
	let shipRouteDateFilters = $derived.by(() => {
		const raw = $effectiveFilters.dateRange;
		if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
			return {} as Record<string, string>;
		}

		const next: Record<string, string> = {};
		if (typeof raw.from === 'string' && raw.from) next.dateFrom = raw.from;
		if (typeof raw.to === 'string' && raw.to) next.dateTo = raw.to;
		return next;
	});
	let selectedShipRouteVessel = $derived.by(
		() => shipRouteCatalog.find((vessel) => vessel.shipHbkId === selectedShipHbkId) ?? null
	);
	let shipRoutePointFeatureCollection = $derived.by((): GeoJSON.FeatureCollection<GeoJSON.Point> => ({
		type: 'FeatureCollection',
		features: shipRoutePoints.map((point) => ({
			type: 'Feature',
			geometry: {
				type: 'Point',
				coordinates: [point.longitude, point.latitude]
			},
			properties: {
				shipHbkId: point.shipHbkId,
				vesselName: point.vesselName,
				pointSeqShip: point.pointSeqShip,
				fetchedAt: point.fetchedAt
			}
		}))
	}));
	let shipRouteSegmentFeatureCollection = $derived.by(
		(): GeoJSON.FeatureCollection<GeoJSON.LineString> => ({
			type: 'FeatureCollection',
			features: shipRouteSegments.map((segment) => ({
				type: 'Feature',
				geometry: {
					type: 'LineString',
					coordinates: [
						[segment.fromLongitude, segment.fromLatitude],
						[segment.toLongitude, segment.toLatitude]
					]
				},
				properties: {
					shipHbkId: segment.shipHbkId,
					vesselName: segment.vesselName,
					segmentSeqShip: segment.segmentSeqShip,
					fromFetchedAt: segment.fromFetchedAt
				}
			}))
		})
	);
	let latestShipRoutePoints = $derived.by(() => [...shipRoutePoints].slice(-8).reverse());

	function setResultKind(nextKind: SearchResultKind) {
		resultKind = nextKind;

		if (
			selectedFeature &&
			((selectedFeature.kind === 'object' && nextKind !== 'objects') ||
				(selectedFeature.kind === 'news' && nextKind !== 'news'))
		) {
			selectedFeature = null;
			selectionFilterSnapshot = null;
		}
	}

	function storeSelection(feature: EmisMapSelectedFeature) {
		selectedFeature = feature;
		selectionFilterSnapshot = effectiveFilterSnapshot;
	}

	function handleMapFeatureSelect(feature: EmisMapSelectedFeature) {
		storeSelection(feature);
		resultKind = feature.kind === 'object' ? 'objects' : 'news';
	}

	function selectObjectRow(row: EmisObjectSummary) {
		storeSelection({
			id: row.id,
			kind: 'object',
			title: row.name,
			subtitle: buildObjectSubtitle(row),
			colorKey: `object-${row.status}`,
			objectTypeId: row.objectTypeId,
			objectTypeCode: row.objectTypeCode,
			objectTypeName: row.objectTypeName,
			countryCode: row.countryCode,
			region: row.region,
			status: row.status,
			updatedAt: row.updatedAt
		});
		resultKind = 'objects';
	}

	function selectNewsRow(row: EmisNewsSummary) {
		storeSelection({
			id: row.id,
			kind: 'news',
			title: row.title,
			subtitle: buildNewsSubtitle(row),
			colorKey: `news-${row.importance ?? 0}`,
			sourceId: row.sourceId,
			sourceName: row.sourceName,
			countryCode: row.countryCode,
			region: row.region,
			newsType: row.newsType,
			importance: row.importance,
			publishedAt: row.publishedAt,
			relatedObjectsCount: row.relatedObjectsCount
		});
		resultKind = 'news';
	}

	function clearSelection() {
		selectedFeature = null;
		selectionFilterSnapshot = null;
	}

	function isSelectedObject(id: string) {
		return selectedFeature?.kind === 'object' && selectedFeature.id === id;
	}

	function isSelectedNews(id: string) {
		return selectedFeature?.kind === 'news' && selectedFeature.id === id;
	}

	async function loadSearchResults(kind: SearchResultKind) {
		const targetId =
			kind === 'objects' ? EMIS_FILTER_TARGETS.searchObjects : EMIS_FILTER_TARGETS.searchNews;
		const endpoint = kind === 'objects' ? '/api/emis/search/objects' : '/api/emis/search/news';
		const params = filterRuntime.getServerParams(targetId);
		const url = new URL(endpoint, window.location.origin);
		appendQueryParams(url, params);
		url.searchParams.set('limit', '25');

		const response = await fetch(`${url.pathname}?${url.searchParams.toString()}`);
		if (!response.ok) {
			const payload = await response.json().catch(() => null);
			throw new Error(
				(payload &&
					typeof payload === 'object' &&
					'error' in payload &&
					typeof payload.error === 'string' &&
					payload.error) ||
					`Search request failed with status ${response.status}`
			);
		}

		if (kind === 'objects') {
			const payload = (await response.json()) as { rows: EmisObjectSummary[]; meta: { count: number } };
			return { kind, rows: payload.rows, meta: payload.meta };
		}

		const payload = (await response.json()) as { rows: EmisNewsSummary[]; meta: { count: number } };
		return { kind, rows: payload.rows, meta: payload.meta };
	}

	async function loadShipRouteCatalog() {
		shipRouteCatalogLoading = true;
		shipRouteCatalogError = null;

		try {
			const response = await fetchDataset({
				id: 'emis.ship_route_points',
				params: { limit: 500 }
			});
			const rows = response.rows as Array<Record<string, unknown>>;
			const catalog = new Map<string, ShipRouteVesselOption>();

			for (const row of rows) {
				const point = parseShipRoutePoint(row);
				if (!point) continue;

				const key = String(point.shipHbkId);
				const existing = catalog.get(key);
				if (!existing) {
					catalog.set(key, {
						shipHbkId: key,
						vesselName: point.vesselName,
						latestFetchedAt: point.fetchedAt,
						routeDateUtc: point.routeDateUtc,
						pointsCount: 1,
						imo: point.imo,
						mmsi: point.mmsi
					});
					continue;
				}

				existing.pointsCount += 1;
				if (new Date(point.fetchedAt).getTime() >= new Date(existing.latestFetchedAt).getTime()) {
					existing.latestFetchedAt = point.fetchedAt;
					existing.vesselName = point.vesselName;
					existing.routeDateUtc = point.routeDateUtc;
					existing.imo = point.imo;
					existing.mmsi = point.mmsi;
				}
			}

			shipRouteCatalog = [...catalog.values()].sort(
				(left, right) =>
					new Date(right.latestFetchedAt).getTime() - new Date(left.latestFetchedAt).getTime()
			);

			if (!selectedShipHbkId || !shipRouteCatalog.some((vessel) => vessel.shipHbkId === selectedShipHbkId)) {
				selectedShipHbkId = shipRouteCatalog[0]?.shipHbkId ?? '';
			}
		} catch (error) {
			shipRouteCatalog = [];
			selectedShipHbkId = '';
			shipRouteCatalogError =
				error instanceof Error ? error.message : 'Не удалось загрузить список судов';
		} finally {
			shipRouteCatalogLoading = false;
		}
	}

	async function loadShipRouteData() {
		if (!selectedShipHbkId) {
			return { points: [] as ShipRoutePointRow[], segments: [] as ShipRouteSegmentRow[] };
		}

		const shipHbkId = Number(selectedShipHbkId);
		const [pointsResponse, segmentsResponse] = await Promise.all([
			fetchDataset({
				id: 'emis.ship_route_points',
				params: { shipHbkId, limit: 5000 },
				filters: shipRouteDateFilters,
				cache: { ttlMs: 10_000 }
			}),
			fetchDataset({
				id: 'emis.ship_route_segments',
				params: { shipHbkId, limit: 5000 },
				filters: shipRouteDateFilters,
				cache: { ttlMs: 10_000 }
			})
		]);

		return {
			points: (pointsResponse.rows as Array<Record<string, unknown>>)
				.map(parseShipRoutePoint)
				.filter((row): row is ShipRoutePointRow => Boolean(row)),
			segments: (segmentsResponse.rows as Array<Record<string, unknown>>)
				.map(parseShipRouteSegment)
				.filter((row): row is ShipRouteSegmentRow => Boolean(row))
		};
	}

	const { reload: reloadResults, loading: resultsLoading } = useDebouncedLoader({
		watch: () => ({ filters: $effectiveFilters, kind: resultKind }),
		delayMs: 300,
		load: () => loadSearchResults(resultKind),
		onData: (payload) => {
			if (payload.kind === 'objects') {
				objectRows = payload.rows;
			} else {
				newsRows = payload.rows;
			}

			resultsMeta = payload.meta;
			resultsError = null;
		},
		onError: (error) => {
			resultsError = error instanceof Error ? error.message : String(error);
			if (resultKind === 'objects') {
				objectRows = [];
			} else {
				newsRows = [];
			}
		}
	});

	const { reload: reloadShipRoute, loading: shipRouteLoading } = useDebouncedLoader({
		watch: () => ({ shipHbkId: selectedShipHbkId, dateFilters: shipRouteDateFilters }),
		delayMs: 250,
		load: loadShipRouteData,
		onData: (payload) => {
			shipRoutePoints = payload.points;
			shipRouteSegments = payload.segments;
			shipRouteError = null;
		},
		onError: (error) => {
			shipRoutePoints = [];
			shipRouteSegments = [];
			shipRouteError =
				error instanceof Error ? error.message : 'Не удалось загрузить маршрут судна';
		}
	});

	$effect(() => {
		const snapshot = effectiveFilterSnapshot;

		if (selectedFeature && selectionFilterSnapshot && snapshot !== selectionFilterSnapshot) {
			clearSelection();
		}
	});

	onMount(() => {
		void loadShipRouteCatalog();
	});
</script>

<svelte:head>
	<title>EMIS Workspace</title>
	<meta
		name="description"
		content="EMIS workspace with shared list/map filters, MapTiler online basemap, local PMTiles offline bundle, and controlled auto fallback."
	/>
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<div class="mx-auto flex max-w-7xl flex-col gap-6">
		<header class="space-y-3">
			<div class="type-caption text-muted-foreground uppercase tracking-[0.24em]">EMIS</div>
			<div class="space-y-2">
				<h1 class="type-page-title">Workspace</h1>
				<p class="max-w-4xl type-body-sm text-muted-foreground">
					Фильтры workspace теперь общие для карты и списка результатов. `dateRange` шарится с
					BI-контуром через app-shared subset, а `bbox` остаётся локальным состоянием карты.
				</p>
			</div>
		</header>

		<Card>
			<CardHeader>
				<CardTitle>Workspace Filters</CardTitle>
				<CardDescription>
					Один runtime для search и map targets. Общий `dateRange` приходит из shared subset, остальные
					значения живут внутри workspace `emis`.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<FilterPanel runtime={filterRuntime} scope="all" direction="horizontal" />

				<div class="flex flex-wrap items-center gap-2">
					<Button
						variant={resultKind === 'objects' ? 'default' : 'outline'}
						onclick={() => setResultKind('objects')}
					>
						Список объектов
					</Button>
					<Button
						variant={resultKind === 'news' ? 'default' : 'outline'}
						onclick={() => setResultKind('news')}
					>
						Список новостей
					</Button>
					<Button variant="outline" onclick={reloadResults} disabled={resultsLoading}>
						{resultsLoading ? 'Обновляем...' : 'Обновить результаты'}
					</Button>
					<div class="type-caption text-muted-foreground">
						Активный layer filter: <span class="font-mono">{activeLayer}</span>
					</div>
				</div>
			</CardContent>
		</Card>

		<div class="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
			<Card class="overflow-hidden">
				<CardHeader class="border-b border-border/60 bg-muted/10">
					<CardTitle>EMIS Map</CardTitle>
					<CardDescription>
						Map runtime получает те же фильтры, что и results list, а `layer` управляет набором
						overlay endpoints.
					</CardDescription>
				</CardHeader>
				<CardContent class="p-4">
					<EmisMap
						mapConfig={data.mapConfig}
						objectsQuery={mapObjectQuery}
						newsQuery={mapNewsQuery}
						routePointsData={shipRoutePointFeatureCollection}
						routeSegmentsData={shipRouteSegmentFeatureCollection}
						routeFocusKey={selectedShipHbkId || null}
						layer={activeLayer}
						selectedFeature={selectedFeatureRef}
						onFeatureSelect={handleMapFeatureSelect}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Search Results</CardTitle>
					<CardDescription>
						Тонкий transport над `listObjectsQuery(...)` и `listNewsQuery(...)`.
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="flex items-center justify-between gap-3">
						<div class="type-caption text-muted-foreground">
							Target: <span class="font-mono">{resultKind}</span>
						</div>
						<div class="type-caption text-muted-foreground">
							Rows: {resultsMeta?.count ?? 0}
						</div>
					</div>

					{#if selectedFeature}
						<div class="rounded-xl border border-info/30 bg-info-muted/30 p-3">
							<div class="flex items-start justify-between gap-3">
								<div class="space-y-1">
									<div class="type-caption uppercase tracking-[0.16em] text-info">
										Selected {selectedFeature.kind}
									</div>
									<div class="type-body-sm font-medium text-foreground">
										{selectedFeature.title}
									</div>
									{#if selectedFeature.subtitle}
										<div class="type-caption text-muted-foreground">
											{selectedFeature.subtitle}
										</div>
									{/if}
								</div>
								<Button variant="ghost" size="sm" onclick={clearSelection}>Сбросить</Button>
							</div>

							<div class="mt-3 grid gap-1 type-caption text-muted-foreground">
								{#if selectedFeature.kind === 'object'}
									<div>
										Status: <span class="font-medium text-foreground">{selectedFeature.status}</span>
									</div>
									<div>
										Updated:
										<span class="font-medium text-foreground">
											{formatDate(selectedFeature.updatedAt)}
										</span>
									</div>
								{:else}
									<div>
										Source:
										<span class="font-medium text-foreground">{selectedFeature.sourceName}</span>
									</div>
									<div>
										Published:
										<span class="font-medium text-foreground">
											{formatDate(selectedFeature.publishedAt)}
										</span>
									</div>
									<div>
										Related:
										<span class="font-medium text-foreground">
											{selectedFeature.relatedObjectsCount}
										</span>
									</div>
								{/if}
							</div>
						</div>
					{/if}

					{#if resultsError}
						<div class="rounded-xl border border-error/30 bg-error-muted/30 p-3 type-body-sm text-error">
							{resultsError}
						</div>
					{:else if resultsLoading && resultKind === 'objects' && objectRows.length === 0}
						<div class="type-body-sm text-muted-foreground">Загружаем объекты...</div>
					{:else if resultsLoading && resultKind === 'news' && newsRows.length === 0}
						<div class="type-body-sm text-muted-foreground">Загружаем новости...</div>
					{:else if resultKind === 'objects'}
						<div class="space-y-3">
							{#if objectRows.length === 0}
								<div class="type-body-sm text-muted-foreground">По текущим фильтрам объекты не найдены.</div>
							{:else}
								{#each objectRows as row (row.id)}
									<button
										type="button"
										class={`w-full rounded-xl border p-3 text-left transition-colors ${
											isSelectedObject(row.id)
												? 'border-info/40 bg-info-muted/30'
												: 'border-border/70 bg-muted/10 hover:bg-muted/20'
										}`}
										onclick={() => selectObjectRow(row)}
									>
										<div class="flex items-start justify-between gap-3">
											<div>
												<div class="type-body-sm font-medium text-foreground">{row.name}</div>
												<div class="type-caption text-muted-foreground">
													{row.objectTypeName}
													{#if row.region}
														<span class="mx-1">•</span>{row.region}
													{/if}
													{#if row.countryCode}
														<span class="mx-1">•</span>{row.countryCode}
													{/if}
												</div>
											</div>
											<div class="type-caption text-muted-foreground">{row.status}</div>
										</div>
										<div class="mt-2 type-caption text-muted-foreground">
											UUID: <span class="font-mono">{row.id}</span>
										</div>
										<div class="mt-1 type-caption text-muted-foreground">
											Updated: {formatDate(row.updatedAt)}
										</div>
									</button>
								{/each}
							{/if}
						</div>
					{:else}
						<div class="space-y-3">
							{#if newsRows.length === 0}
								<div class="type-body-sm text-muted-foreground">По текущим фильтрам новости не найдены.</div>
							{:else}
								{#each newsRows as row (row.id)}
									<button
										type="button"
										class={`w-full rounded-xl border p-3 text-left transition-colors ${
											isSelectedNews(row.id)
												? 'border-info/40 bg-info-muted/30'
												: 'border-border/70 bg-muted/10 hover:bg-muted/20'
										}`}
										onclick={() => selectNewsRow(row)}
									>
										<div class="flex items-start justify-between gap-3">
											<div>
												<div class="type-body-sm font-medium text-foreground">{row.title}</div>
												<div class="type-caption text-muted-foreground">
													{row.sourceName}
													{#if row.newsType}
														<span class="mx-1">•</span>{row.newsType}
													{/if}
													{#if row.region}
														<span class="mx-1">•</span>{row.region}
													{/if}
												</div>
											</div>
											<div class="type-caption text-muted-foreground">
												related: {row.relatedObjectsCount}
											</div>
										</div>
										<div class="mt-2 type-caption text-muted-foreground">
											Published: {formatDate(row.publishedAt)}
										</div>
									</button>
								{/each}
							{/if}
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>

		<div class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
			<Card>
				<CardHeader>
					<CardTitle>Ship Route Slice</CardTitle>
					<CardDescription>
						Живой vertical slice поверх `emis.ship_route_points` и `emis.ship_route_segments`.
						Используем `shipHbkId` как главный идентификатор и переиспользуем общий `dateRange`,
						если он задан в workspace filters.
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
						<div class="space-y-2">
							<label class="type-caption text-muted-foreground" for="ship-route-select">
								Судно
							</label>
							<Select
								id="ship-route-select"
								bind:value={selectedShipHbkId}
								disabled={shipRouteCatalogLoading || shipRouteCatalog.length === 0}
							>
								<option value="" disabled>Выберите судно</option>
								{#each shipRouteCatalog as vessel (vessel.shipHbkId)}
									<option value={vessel.shipHbkId}>
										{vessel.vesselName} · HBK {vessel.shipHbkId}
									</option>
								{/each}
							</Select>
						</div>
						<div class="flex items-end">
							<Button
								variant="outline"
								onclick={() => void loadShipRouteCatalog()}
								disabled={shipRouteCatalogLoading}
							>
								{shipRouteCatalogLoading ? 'Обновляем суда...' : 'Обновить суда'}
							</Button>
						</div>
						<div class="flex items-end">
							<Button
								variant="outline"
								onclick={reloadShipRoute}
								disabled={shipRouteLoading || !selectedShipHbkId}
							>
								{shipRouteLoading ? 'Обновляем трек...' : 'Обновить трек'}
							</Button>
						</div>
					</div>

					{#if shipRouteCatalogError}
						<div class="rounded-xl border border-error/30 bg-error-muted/30 p-3 type-body-sm text-error">
							{shipRouteCatalogError}
						</div>
					{/if}

					{#if selectedShipRouteVessel}
						<div class="grid gap-3 rounded-xl border border-border/70 bg-muted/10 p-4 md:grid-cols-2 xl:grid-cols-4">
							<div>
								<div class="type-caption text-muted-foreground">Vessel</div>
								<div class="type-body-sm font-medium text-foreground">
									{selectedShipRouteVessel.vesselName}
								</div>
								<div class="type-caption text-muted-foreground">
									HBK {selectedShipRouteVessel.shipHbkId}
								</div>
							</div>
							<div>
								<div class="type-caption text-muted-foreground">Latest point</div>
								<div class="type-body-sm font-medium text-foreground">
									{formatDate(selectedShipRouteVessel.latestFetchedAt)}
								</div>
								<div class="type-caption text-muted-foreground">
									Route day: {selectedShipRouteVessel.routeDateUtc ?? 'n/a'}
								</div>
							</div>
							<div>
								<div class="type-caption text-muted-foreground">Track shape</div>
								<div class="type-body-sm font-medium text-foreground">
									{shipRoutePoints.length} points / {shipRouteSegments.length} segments
								</div>
								<div class="type-caption text-muted-foreground">
									Catalog sample: {selectedShipRouteVessel.pointsCount} points
								</div>
							</div>
							<div>
								<div class="type-caption text-muted-foreground">Identifiers</div>
								<div class="type-body-sm font-medium text-foreground">
									IMO {selectedShipRouteVessel.imo ?? 'n/a'}
								</div>
								<div class="type-caption text-muted-foreground">
									MMSI {selectedShipRouteVessel.mmsi ?? 'n/a'}
								</div>
							</div>
						</div>
					{/if}

					{#if shipRouteError}
						<div class="rounded-xl border border-error/30 bg-error-muted/30 p-3 type-body-sm text-error">
							{shipRouteError}
						</div>
					{:else if shipRouteLoading && !shipRoutePoints.length}
						<div class="type-body-sm text-muted-foreground">Загружаем маршрут судна...</div>
					{:else if !selectedShipHbkId}
						<div class="type-body-sm text-muted-foreground">
							В `mart_emis` пока не выбрано судно для route preview.
						</div>
					{:else if shipRoutePoints.length === 0}
						<div class="type-body-sm text-muted-foreground">
							По выбранному судну и текущему периоду маршрутных точек не найдено.
						</div>
					{:else}
						<div class="grid gap-3 md:grid-cols-3">
							<div class="rounded-xl border border-border/70 bg-background/80 p-3">
								<div class="type-caption text-muted-foreground">First point</div>
								<div class="type-body-sm font-medium text-foreground">
									{formatDate(shipRoutePoints[0].fetchedAt)}
								</div>
								<div class="type-caption text-muted-foreground">
									{formatCoordinate(shipRoutePoints[0].latitude)},
									{formatCoordinate(shipRoutePoints[0].longitude)}
								</div>
							</div>
							<div class="rounded-xl border border-border/70 bg-background/80 p-3">
								<div class="type-caption text-muted-foreground">Last point</div>
								<div class="type-body-sm font-medium text-foreground">
									{formatDate(shipRoutePoints[shipRoutePoints.length - 1].fetchedAt)}
								</div>
								<div class="type-caption text-muted-foreground">
									{formatCoordinate(shipRoutePoints[shipRoutePoints.length - 1].latitude)},
									{formatCoordinate(shipRoutePoints[shipRoutePoints.length - 1].longitude)}
								</div>
							</div>
							<div class="rounded-xl border border-border/70 bg-background/80 p-3">
								<div class="type-caption text-muted-foreground">Latest speed</div>
								<div class="type-body-sm font-medium text-foreground">
									{formatMetric(shipRoutePoints[shipRoutePoints.length - 1].speed, ' kn')}
								</div>
								<div class="type-caption text-muted-foreground">
									Gap from prev:
									{formatMetric(
										shipRoutePoints[shipRoutePoints.length - 1].gapMinutesFromPrev,
										' min'
									)}
								</div>
							</div>
						</div>
					{/if}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Latest Track Points</CardTitle>
					<CardDescription>
						Последние точки выбранного маршрута. Этого достаточно, чтобы быстро проверить,
						нормально ли `mart_emis` ложится в текущий workspace.
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-3">
					{#if latestShipRoutePoints.length === 0}
						<div class="type-body-sm text-muted-foreground">
							Здесь появятся точки, как только выберем судно и загрузим маршрут.
						</div>
					{:else}
						{#each latestShipRoutePoints as point (point.routePointId)}
							<div class="rounded-xl border border-border/70 bg-muted/10 p-3">
								<div class="flex items-start justify-between gap-3">
									<div>
										<div class="type-body-sm font-medium text-foreground">
											Seq #{point.pointSeqShip}
										</div>
										<div class="type-caption text-muted-foreground">
											{formatDate(point.fetchedAt)}
										</div>
									</div>
									<div class="type-caption text-muted-foreground">
										{formatMetric(point.speed, ' kn')}
									</div>
								</div>
								<div class="mt-2 grid gap-1 type-caption text-muted-foreground">
									<div>
										Coords:
										<span class="font-medium text-foreground">
											{formatCoordinate(point.latitude)}, {formatCoordinate(point.longitude)}
										</span>
									</div>
									<div>
										Heading/Course:
										<span class="font-medium text-foreground">
											{formatMetric(point.heading)} / {formatMetric(point.course)}
										</span>
									</div>
									<div>
										Gap prev/next:
										<span class="font-medium text-foreground">
											{formatMetric(point.gapMinutesFromPrev, ' min')} /
											{formatMetric(point.gapMinutesToNext, ' min')}
										</span>
									</div>
								</div>
							</div>
						{/each}
					{/if}
				</CardContent>
			</Card>
		</div>

		<div class="grid gap-4 md:grid-cols-3">
			<Card>
				<CardHeader>
					<CardTitle>Map Config</CardTitle>
					<CardDescription>Текущий server-resolved runtime profile</CardDescription>
				</CardHeader>
				<CardContent class="space-y-2 type-body-sm text-muted-foreground">
					<p>
						Requested mode: <span class="font-mono">{data.mapConfig.requestedMode}</span>
					</p>
					<p>
						Effective mode: <span class="font-mono">{data.mapConfig.effectiveMode}</span>
					</p>
					<p>
						Online style:
						<span class="font-mono break-all">{data.mapConfig.onlineStyleUrl ?? 'not configured'}</span>
					</p>
					<p>
						Offline PMTiles:
						<span class="font-mono break-all">{data.mapConfig.offlinePmtilesUrl ?? 'not configured'}</span>
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Offline Bundle Status</CardTitle>
					<CardDescription>Что уже лежит в локальном PMTiles bundle</CardDescription>
				</CardHeader>
				<CardContent class="grid gap-2 type-body-sm">
					{#each assetChecklist as item}
						<div
							class={`flex items-center justify-between rounded-xl border px-3 py-2 ${toneClass(item.ready)}`}
						>
							<span>{item.label}</span>
							<span class="font-mono text-[11px] uppercase">{item.ready ? 'ready' : 'missing'}</span>
						</div>
					{/each}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Ops Commands</CardTitle>
					<CardDescription>Как проверять basemap и фильтры локально</CardDescription>
				</CardHeader>
				<CardContent class="space-y-2 type-body-sm text-muted-foreground">
					<p><span class="font-mono">pnpm map:assets:status</span> - проверить bundle</p>
					<p><span class="font-mono">pnpm map:pmtiles:setup</span> - собрать локальный PMTiles bundle</p>
					<p><span class="font-mono">pnpm check</span> - проверить типы после изменения filter runtime</p>
					<p class="type-caption">
						Текущие workspace endpoints: <span class="font-mono">/api/emis/search/*</span> и
						<span class="font-mono"> /api/emis/map/*</span>
					</p>
				</CardContent>
			</Card>
		</div>
	</div>
</div>
