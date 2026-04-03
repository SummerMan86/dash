<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	import type {
		EmisMapRouteFeatureRef,
		EmisMapSelectedFeature,
		EmisMapSelectedRouteFeature
	} from '$entities/emis-map';
	import type { EmisNewsSummary } from '$entities/emis-news';
	import type { EmisObjectSummary } from '$entities/emis-object';
	import type { EmisShipRoutePoint, EmisShipRouteSegment } from '$entities/emis-ship-route';
	import { useFilterWorkspace } from '$entities/filter';
	import { useDebouncedLoader } from '$shared/lib/useDebouncedLoader.svelte';
	import { Button } from '$shared/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$shared/ui/card';
	import { FilterPanel } from '$widgets/filters';
	import { EmisMap } from '$widgets/emis-map';

	import {
		emisWorkspaceFilters,
		EMIS_FILTER_TARGETS,
		EMIS_PRIMARY_FILTER_IDS
	} from './filters';
	import type { SearchResultKind, RouteUrlSelection } from './emisPageHelpers';
	import {
		appendQueryParams,
		fetchJson,
		parseSearchResultKind,
		parseRouteMode,
		parsePositiveIntParam,
		buildObjectSubtitle,
		buildNewsSubtitle,
		toneClass
	} from './emisPageHelpers';
	import type { ShipRouteVesselOption } from './emisPageSelection';
	import {
		buildRoutePointSelection,
		buildRouteSegmentSelection,
		buildVesselSelectionFeature
	} from './emisPageSelection';
	import {
		buildShipRoutePointFeatureCollection,
		buildShipRouteSegmentFeatureCollection
	} from './emisPageGeoJson';
	import SearchResultsPanel from './SearchResultsPanel.svelte';
	import ShipRoutePanel from './ShipRoutePanel.svelte';
	import { SHIP_ROUTE_LIMIT } from './emisPageHelpers';

	let { data }: { data: PageData } = $props();

	const filterRuntime = useFilterWorkspace({
		workspaceId: 'emis',
		ownerId: 'workspace',
		specs: emisWorkspaceFilters
	});
	let effectiveFilters = $derived(filterRuntime.effective);

	/* ── Page-level state ───────────────────────────────────────────── */

	let preferredResultKind = $state<SearchResultKind>('objects');
	let objectRows = $state<EmisObjectSummary[]>([]);
	let newsRows = $state<EmisNewsSummary[]>([]);
	let resultsError = $state<string | null>(null);
	let resultsMeta = $state<{ count: number } | null>(null);
	let selectedFeature = $state<EmisMapSelectedFeature | null>(null);
	let selectionFilterSnapshot = $state<string | null>(null);
	let selectedRouteFeature = $state<EmisMapSelectedRouteFeature | null>(null);
	let initialRouteSelection = $state<RouteUrlSelection | null>(null);
	let routeSelectionSyncEnabled = $state(false);
	let shipRouteCatalog = $state<ShipRouteVesselOption[]>([]);
	let shipRoutePoints = $state<EmisShipRoutePoint[]>([]);
	let shipRouteSegments = $state<EmisShipRouteSegment[]>([]);
	let shipRouteCatalogLoading = $state(false);
	let shipRouteCatalogError = $state<string | null>(null);
	let shipRouteError = $state<string | null>(null);

	/* ── Derived state ──────────────────────────────────────────────── */

	const assetChecklist = [
		{ key: 'pmtiles', label: '.pmtiles archive', ready: data.mapConfig.offlineAssets.pmtiles },
		{ key: 'sprites', label: 'sprites', ready: data.mapConfig.offlineAssets.sprites },
		{ key: 'fonts', label: 'fonts', ready: data.mapConfig.offlineAssets.fonts },
		{ key: 'manifest', label: 'manifest.json', ready: data.mapConfig.offlineAssets.manifest }
	];

	let activeLayer = $derived.by((): 'all' | 'objects' | 'news' | 'vessels' => {
		const raw = $effectiveFilters.layer;
		return raw === 'objects' || raw === 'news' || raw === 'vessels' ? raw : 'all';
	});
	let isVesselMode = $derived(activeLayer === 'vessels');
	let selectedShipHbkId = $derived.by(() => {
		const raw = $effectiveFilters.shipHbkId;
		return typeof raw === 'string' ? raw : '';
	});
	let routeMode = $derived.by(() => parseRouteMode($effectiveFilters.routeMode));
	let routeModeShowsPoints = $derived(routeMode === 'points' || routeMode === 'both');
	let routeModeShowsSegments = $derived(routeMode === 'segments' || routeMode === 'both');
	let effectiveFilterSnapshot = $derived(JSON.stringify($effectiveFilters));
	let selectedFeatureRef = $derived(
		selectedFeature ? { id: selectedFeature.id, kind: selectedFeature.kind } : null
	);
	let selectedRouteFeatureRef = $derived.by<EmisMapRouteFeatureRef | null>(() => {
		if (!selectedRouteFeature) return null;
		return selectedRouteFeature.kind === 'route-point'
			? { kind: 'route-point', routePointId: selectedRouteFeature.routePointId }
			: { kind: 'route-segment', segmentSeqShip: selectedRouteFeature.segmentSeqShip };
	});

	let mapObjectQuery = $derived.by(() =>
		filterRuntime.getServerParams(EMIS_FILTER_TARGETS.mapObjects)
	);
	let mapNewsQuery = $derived.by(() => filterRuntime.getServerParams(EMIS_FILTER_TARGETS.mapNews));
	let mapVesselsQuery = $derived.by(() =>
		filterRuntime.getServerParams(EMIS_FILTER_TARGETS.mapVessels)
	);
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
		() => shipRouteCatalog.find((vessel) => String(vessel.shipHbkId) === selectedShipHbkId) ?? null
	);
	let shipRoutePointFeatureCollection = $derived.by(() =>
		buildShipRoutePointFeatureCollection(shipRoutePoints, routeModeShowsPoints)
	);
	let shipRouteSegmentFeatureCollection = $derived.by(() =>
		buildShipRouteSegmentFeatureCollection(shipRouteSegments, routeModeShowsSegments)
	);
	let latestShipRoutePoints = $derived.by(() =>
		routeModeShowsPoints ? [...shipRoutePoints].slice(-8).reverse() : []
	);

	let effectiveResultKind = $derived.by<SearchResultKind>(() => {
		if (activeLayer === 'objects') return 'objects';
		if (activeLayer === 'news') return 'news';
		return preferredResultKind;
	});

	/* ── Selection orchestration ────────────────────────────────────── */

	function setResultKind(nextKind: SearchResultKind) {
		preferredResultKind = nextKind;

		if (activeLayer !== 'all' && activeLayer !== nextKind) {
			filterRuntime.setFilter('layer', nextKind);
		}

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
		if (feature.kind === 'object') preferredResultKind = 'objects';
		else if (feature.kind === 'news') preferredResultKind = 'news';
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
		preferredResultKind = 'objects';
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
			relatedObjectsCount: row.relatedObjectsCount,
			summary: null,
			url: null
		});
		preferredResultKind = 'news';
	}

	function selectVesselFromCatalog(vessel: ShipRouteVesselOption) {
		storeSelection(buildVesselSelectionFeature(vessel));
	}

	function clearSelection() {
		selectedFeature = null;
		selectionFilterSnapshot = null;
	}

	function selectRoutePoint(point: EmisShipRoutePoint) {
		selectedRouteFeature = buildRoutePointSelection(point);
	}

	function handleMapRouteFeatureSelect(feature: EmisMapSelectedRouteFeature) {
		selectedRouteFeature = feature;
	}

	function clearRouteSelection() {
		selectedRouteFeature = null;
	}

	function isSelectedRoutePoint(routePointId: number) {
		return (
			selectedRouteFeature?.kind === 'route-point' &&
			selectedRouteFeature.routePointId === routePointId
		);
	}

	/* ── URL/route selection sync ───────────────────────────────────── */

	function getRouteSelectionFromUrl(): RouteUrlSelection | null {
		if (!browser) return null;
		const params = new URLSearchParams(window.location.search);
		const routePointId = parsePositiveIntParam(params.get('routePointId'));
		const routeSegmentSeq = parsePositiveIntParam(params.get('routeSegmentSeq'));
		if (routePointId) return { kind: 'route-point', routePointId };
		if (routeSegmentSeq) return { kind: 'route-segment', segmentSeqShip: routeSegmentSeq };
		return null;
	}

	function syncRouteSelectionFromUrl(
		points: EmisShipRoutePoint[],
		segments: EmisShipRouteSegment[]
	) {
		const urlSelection = initialRouteSelection ?? getRouteSelectionFromUrl();
		initialRouteSelection = null;
		routeSelectionSyncEnabled = true;
		if (!urlSelection) {
			selectedRouteFeature = null;
			return;
		}

		if (urlSelection.kind === 'route-point') {
			if (!routeModeShowsPoints) {
				selectedRouteFeature = null;
				return;
			}
			const point = points.find((item) => item.routePointId === urlSelection.routePointId);
			selectedRouteFeature = point ? buildRoutePointSelection(point) : null;
			return;
		}

		if (!routeModeShowsSegments) {
			selectedRouteFeature = null;
			return;
		}
		const segment = segments.find((item) => item.segmentSeqShip === urlSelection.segmentSeqShip);
		selectedRouteFeature = segment ? buildRouteSegmentSelection(segment) : null;
	}

	/* ── Data loading ───────────────────────────────────────────────── */

	async function loadSearchResults(kind: SearchResultKind) {
		const targetId =
			kind === 'objects' ? EMIS_FILTER_TARGETS.searchObjects : EMIS_FILTER_TARGETS.searchNews;
		const endpoint = kind === 'objects' ? '/api/emis/search/objects' : '/api/emis/search/news';
		const params = filterRuntime.getServerParams(targetId);
		const url = new URL(endpoint, window.location.origin);
		appendQueryParams(url, params);
		url.searchParams.set('limit', '50');

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
			const payload = (await response.json()) as {
				rows: EmisObjectSummary[];
				meta: { count: number };
			};
			return { kind, rows: payload.rows, meta: payload.meta };
		}

		const payload = (await response.json()) as { rows: EmisNewsSummary[]; meta: { count: number } };
		return { kind, rows: payload.rows, meta: payload.meta };
	}

	async function loadShipRouteCatalog() {
		shipRouteCatalogLoading = true;
		shipRouteCatalogError = null;

		try {
			const url = new URL('/api/emis/ship-routes/vessels', window.location.origin);
			url.searchParams.set('limit', '250');
			const payload = await fetchJson<{ rows: ShipRouteVesselOption[] }>(url);
			shipRouteCatalog = payload.rows;

			const nextShipHbkId = shipRouteCatalog[0] ? String(shipRouteCatalog[0].shipHbkId) : null;
			if (
				!selectedShipHbkId ||
				!shipRouteCatalog.some((vessel) => String(vessel.shipHbkId) === selectedShipHbkId)
			) {
				filterRuntime.setFilter('shipHbkId', nextShipHbkId);
			}
		} catch (error) {
			shipRouteCatalog = [];
			shipRouteCatalogError =
				error instanceof Error ? error.message : 'Не удалось загрузить список судов';
		} finally {
			shipRouteCatalogLoading = false;
		}
	}

	async function loadShipRouteData() {
		if (!selectedShipHbkId) {
			return { points: [] as EmisShipRoutePoint[], segments: [] as EmisShipRouteSegment[] };
		}

		const shipHbkId = Number(selectedShipHbkId);
		const shouldLoadPoints = routeMode !== 'segments';
		const shouldLoadSegments = routeMode !== 'points';

		const pointsUrl = shouldLoadPoints
			? new URL('/api/emis/ship-routes/points', window.location.origin)
			: null;
		const segmentsUrl = shouldLoadSegments
			? new URL('/api/emis/ship-routes/segments', window.location.origin)
			: null;

		if (pointsUrl) {
			appendQueryParams(pointsUrl, { shipHbkId, limit: SHIP_ROUTE_LIMIT, ...shipRouteDateFilters });
		}
		if (segmentsUrl) {
			appendQueryParams(segmentsUrl, {
				shipHbkId,
				limit: SHIP_ROUTE_LIMIT,
				...shipRouteDateFilters
			});
		}

		const [pointsResponse, segmentsResponse] = await Promise.all([
			pointsUrl
				? fetchJson<{ rows: EmisShipRoutePoint[] }>(pointsUrl)
				: Promise.resolve({ rows: [] as EmisShipRoutePoint[] }),
			segmentsUrl
				? fetchJson<{ rows: EmisShipRouteSegment[] }>(segmentsUrl)
				: Promise.resolve({ rows: [] as EmisShipRouteSegment[] })
		]);

		return {
			points: pointsResponse.rows,
			segments: segmentsResponse.rows
		};
	}

	/* ── Loaders ─────────────────────────────────────────────────────── */

	const resultsLoader = useDebouncedLoader({
		watch: () => ({ filters: $effectiveFilters, kind: effectiveResultKind }),
		delayMs: 300,
		load: () => loadSearchResults(effectiveResultKind),
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
			if (effectiveResultKind === 'objects') {
				objectRows = [];
			} else {
				newsRows = [];
			}
		}
	});

	const shipRouteLoader = useDebouncedLoader({
		watch: () => ({
			shipHbkId: selectedShipHbkId,
			dateFilters: shipRouteDateFilters,
			routeMode
		}),
		delayMs: 250,
		load: loadShipRouteData,
		onData: (payload) => {
			shipRoutePoints = payload.points;
			shipRouteSegments = payload.segments;
			syncRouteSelectionFromUrl(payload.points, payload.segments);
			shipRouteError = null;
		},
		onError: (error) => {
			shipRoutePoints = [];
			shipRouteSegments = [];
			selectedRouteFeature = null;
			initialRouteSelection = null;
			routeSelectionSyncEnabled = true;
			shipRouteError =
				error instanceof Error ? error.message : 'Не удалось загрузить маршрут судна';
		}
	});

	/* ── Effects ─────────────────────────────────────────────────────── */

	$effect(() => {
		const snapshot = effectiveFilterSnapshot;

		if (selectedFeature && selectionFilterSnapshot && snapshot !== selectionFilterSnapshot) {
			clearSelection();
		}
	});

	$effect(() => {
		const target = effectiveResultKind;

		if (
			selectedFeature &&
			((selectedFeature.kind === 'object' && target !== 'objects') ||
				(selectedFeature.kind === 'news' && target !== 'news'))
		) {
			clearSelection();
		}
	});

	$effect(() => {
		if (activeLayer === 'objects' || activeLayer === 'news') {
			preferredResultKind = activeLayer;
		}
	});

	$effect(() => {
		if (
			selectedRouteFeature &&
			((selectedRouteFeature.kind === 'route-point' && !routeModeShowsPoints) ||
				(selectedRouteFeature.kind === 'route-segment' && !routeModeShowsSegments))
		) {
			selectedRouteFeature = null;
		}
	});

	$effect(() => {
		if (!selectedRouteFeature || !selectedShipHbkId) return;
		if (String(selectedRouteFeature.shipHbkId) !== selectedShipHbkId) {
			selectedRouteFeature = null;
		}
	});

	$effect(() => {
		const target = preferredResultKind;

		if (!browser) return;

		const url = new URL(window.location.href);
		if (url.searchParams.get('target') === target) return;

		url.searchParams.set('target', target);
		window.history.replaceState(
			window.history.state,
			'',
			`${url.pathname}?${url.searchParams.toString()}${url.hash}`
		);
	});

	$effect(() => {
		const selection = selectedRouteFeature;

		if (!browser || !routeSelectionSyncEnabled) return;

		const url = new URL(window.location.href);
		if (selection?.kind === 'route-point') {
			url.searchParams.set('routePointId', String(selection.routePointId));
			url.searchParams.delete('routeSegmentSeq');
		} else if (selection?.kind === 'route-segment') {
			url.searchParams.set('routeSegmentSeq', String(selection.segmentSeqShip));
			url.searchParams.delete('routePointId');
		} else {
			url.searchParams.delete('routePointId');
			url.searchParams.delete('routeSegmentSeq');
		}

		window.history.replaceState(
			window.history.state,
			'',
			`${url.pathname}?${url.searchParams.toString()}${url.hash}`
		);
	});

	onMount(() => {
		const initialTarget = parseSearchResultKind(
			new URLSearchParams(window.location.search).get('target')
		);
		if (initialTarget) {
			preferredResultKind = initialTarget;
		}
		initialRouteSelection = getRouteSelectionFromUrl();
		if (!initialRouteSelection) {
			routeSelectionSyncEnabled = true;
		}

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
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="type-caption tracking-[0.24em] text-muted-foreground uppercase">EMIS</div>
				<div class="type-caption flex flex-wrap items-center gap-3 text-muted-foreground">
					<a class="underline underline-offset-4" href="/dashboard/emis">BI Overview</a>
					<a class="underline underline-offset-4" href="/dashboard/emis/vessel-positions"
						>Vessel Positions</a
					>
					<a class="underline underline-offset-4" href="/emis/objects">Каталог объектов</a>
					<a class="underline underline-offset-4" href="/emis/news">Каталог новостей</a>
					<a class="underline underline-offset-4" href="/emis/objects/new">Создать объект</a>
					<a class="underline underline-offset-4" href="/emis/news/new">Создать новость</a>
				</div>
			</div>
			<div class="space-y-2">
				<h1 class="type-page-title">Workspace</h1>
				<p class="type-body-sm max-w-4xl text-muted-foreground">
					Фильтры workspace теперь общие для карты и списка результатов. `dateRange` шарится с
					BI-контуром через app-shared subset, а `bbox` остаётся локальным состоянием карты.
				</p>
			</div>
		</header>

		<Card>
			<CardHeader>
				<CardTitle>Workspace Filters</CardTitle>
				<CardDescription>
					Один runtime для search и map targets. Общий `dateRange` приходит из shared subset,
					остальные значения живут внутри workspace `emis`.
				</CardDescription>
			</CardHeader>
			<CardContent class="space-y-4">
				<FilterPanel
					runtime={filterRuntime}
					scope="all"
					direction="horizontal"
					filterIds={[...EMIS_PRIMARY_FILTER_IDS]}
				/>

				<div class="flex flex-wrap items-center gap-2">
					<Button
						variant={effectiveResultKind === 'objects' ? 'default' : 'outline'}
						disabled={activeLayer === 'news'}
						onclick={() => setResultKind('objects')}
					>
						Список объектов
					</Button>
					<Button
						variant={effectiveResultKind === 'news' ? 'default' : 'outline'}
						disabled={activeLayer === 'objects'}
						onclick={() => setResultKind('news')}
					>
						Список новостей
					</Button>
					<Button variant="outline" onclick={resultsLoader.reload} disabled={resultsLoader.loading}>
						{resultsLoader.loading ? 'Обновляем...' : 'Обновить результаты'}
					</Button>
					<div class="type-caption text-muted-foreground">
						Активный layer filter: <span class="font-mono">{activeLayer}</span>
					</div>
					<div class="type-caption text-muted-foreground">
						Search target: <span class="font-mono">{effectiveResultKind}</span>
					</div>
				</div>
				{#if activeLayer !== 'all'}
					<div
						class="type-caption rounded-xl border border-info/20 bg-info-muted/20 px-3 py-2 text-muted-foreground"
					>
						Список сейчас синхронизирован с `layer={activeLayer}`. Для независимого выбора target
						верните layer в <span class="font-mono">all</span>.
					</div>
				{/if}
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
						vesselsQuery={mapVesselsQuery}
						routePointsData={isVesselMode ? undefined : shipRoutePointFeatureCollection}
						routeSegmentsData={isVesselMode ? undefined : shipRouteSegmentFeatureCollection}
						routeFocusKey={isVesselMode ? null : selectedShipHbkId || null}
						layer={activeLayer}
						selectedFeature={selectedFeatureRef}
						selectedRouteFeature={isVesselMode ? null : selectedRouteFeatureRef}
						onFeatureSelect={handleMapFeatureSelect}
						onRouteFeatureSelect={handleMapRouteFeatureSelect}
					/>
				</CardContent>
			</Card>

			<SearchResultsPanel
				{isVesselMode}
				{effectiveResultKind}
				{shipRouteCatalog}
				{shipRouteCatalogLoading}
				{shipRouteCatalogError}
				loadShipRouteCatalog={() => void loadShipRouteCatalog()}
				{selectedFeature}
				{objectRows}
				{newsRows}
				resultsLoaderLoading={resultsLoader.loading}
				{resultsError}
				{resultsMeta}
				{selectVesselFromCatalog}
				{selectObjectRow}
				{selectNewsRow}
				{clearSelection}
			/>
		</div>

		{#if !isVesselMode}
			<ShipRoutePanel
				{filterRuntime}
				{shipRouteCatalogLoading}
				{shipRouteCatalogError}
				loadShipRouteCatalog={() => void loadShipRouteCatalog()}
				shipRouteLoaderLoading={shipRouteLoader.loading}
				shipRouteLoaderReload={shipRouteLoader.reload}
				{selectedShipHbkId}
				{selectedShipRouteVessel}
				{routeMode}
				{routeModeShowsPoints}
				{routeModeShowsSegments}
				{shipRoutePoints}
				{shipRouteSegments}
				{selectedRouteFeature}
				{clearRouteSelection}
				{shipRouteError}
				{latestShipRoutePoints}
				{isSelectedRoutePoint}
				{selectRoutePoint}
			/>
		{/if}

		<div class="grid gap-4 md:grid-cols-3">
			<Card>
				<CardHeader>
					<CardTitle>Map Config</CardTitle>
					<CardDescription>Текущий server-resolved runtime profile</CardDescription>
				</CardHeader>
				<CardContent class="type-body-sm space-y-2 text-muted-foreground">
					<p>
						Requested mode: <span class="font-mono">{data.mapConfig.requestedMode}</span>
					</p>
					<p>
						Effective mode: <span class="font-mono">{data.mapConfig.effectiveMode}</span>
					</p>
					<p>
						Online style:
						<span class="font-mono break-all"
							>{data.mapConfig.onlineStyleUrl ?? 'not configured'}</span
						>
					</p>
					<p>
						Offline PMTiles:
						<span class="font-mono break-all"
							>{data.mapConfig.offlinePmtilesUrl ?? 'not configured'}</span
						>
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Offline Bundle Status</CardTitle>
					<CardDescription>Что уже лежит в локальном PMTiles bundle</CardDescription>
				</CardHeader>
				<CardContent class="type-body-sm grid gap-2">
					{#each assetChecklist as item}
						<div
							class={`flex items-center justify-between rounded-xl border px-3 py-2 ${toneClass(item.ready)}`}
						>
							<span>{item.label}</span>
							<span class="font-mono text-[11px] uppercase">{item.ready ? 'ready' : 'missing'}</span
							>
						</div>
					{/each}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Ops Commands</CardTitle>
					<CardDescription>Как проверять basemap и фильтры локально</CardDescription>
				</CardHeader>
				<CardContent class="type-body-sm space-y-2 text-muted-foreground">
					<p><span class="font-mono">pnpm map:assets:status</span> - проверить bundle</p>
					<p>
						<span class="font-mono">pnpm map:pmtiles:setup</span> - собрать локальный PMTiles bundle
					</p>
					<p>
						<span class="font-mono">pnpm check</span> - проверить типы после изменения filter runtime
					</p>
					<p class="type-caption">
						Текущие workspace endpoints: <span class="font-mono">/api/emis/search/*</span> и
						<span class="font-mono"> /api/emis/map/*</span>
					</p>
				</CardContent>
			</Card>
		</div>
	</div>
</div>
