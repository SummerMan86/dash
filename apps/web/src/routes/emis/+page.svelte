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
	import type {
		EmisShipRoutePoint,
		EmisShipRouteSegment,
		EmisShipRouteVessel
	} from '$entities/emis-ship-route';
	import { useFilterWorkspace } from '$entities/filter';
	import { useDebouncedLoader } from '$shared/lib/useDebouncedLoader.svelte';
	import { Button } from '$shared/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$shared/ui/card';
	import { Skeleton } from '$shared/ui/skeleton';
	import { FilterPanel } from '$widgets/filters';
	import { EmisMap } from '$widgets/emis-map';

	import {
		emisWorkspaceFilters,
		EMIS_FILTER_TARGETS,
		EMIS_PRIMARY_FILTER_IDS,
		EMIS_SHIP_ROUTE_FILTER_IDS
	} from './filters';

	const SHIP_ROUTE_LIMIT = 5000;

	type SearchResultKind = 'objects' | 'news';
	type ShipRouteVesselOption = EmisShipRouteVessel & { vesselLabel: string };
	type RouteMode = 'points' | 'segments' | 'both';
	type RouteUrlSelection =
		| { kind: 'route-point'; routePointId: number }
		| { kind: 'route-segment'; segmentSeqShip: number };

	let { data }: { data: PageData } = $props();

	const filterRuntime = useFilterWorkspace({
		workspaceId: 'emis',
		ownerId: 'workspace',
		specs: emisWorkspaceFilters
	});
	let effectiveFilters = $derived(filterRuntime.effective);

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

	function formatCoordinate(value: number) {
		return value.toFixed(4);
	}

	function formatMetric(value: number | null, suffix = '') {
		if (value === null) return 'n/a';
		return `${value.toFixed(1)}${suffix}`;
	}

	function parseSearchResultKind(value: string | null | undefined): SearchResultKind | null {
		return value === 'objects' || value === 'news' ? value : null;
	}

	function parseRouteMode(value: unknown): RouteMode {
		return value === 'points' || value === 'segments' ? value : 'both';
	}

	function parsePositiveIntParam(value: string | null): number | null {
		if (!value) return null;
		const parsed = Number(value);
		return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
	}

	function getObjectDetailHref(id: string) {
		return `/emis/objects/${id}`;
	}

	function getNewsDetailHref(id: string) {
		return `/emis/news/${id}`;
	}

	function getSelectedFeatureHref(feature: EmisMapSelectedFeature): string | null {
		if (feature.kind === 'object') return getObjectDetailHref(feature.id);
		if (feature.kind === 'news') return getNewsDetailHref(feature.id);
		return null;
	}

	async function fetchJson<T>(url: URL): Promise<T> {
		const response = await fetch(`${url.pathname}?${url.searchParams.toString()}`);
		if (!response.ok) {
			const payload = await response.json().catch(() => null);
			throw new Error(
				(payload &&
					typeof payload === 'object' &&
					'error' in payload &&
					typeof payload.error === 'string' &&
					payload.error) ||
					`Request failed with status ${response.status}`
			);
		}

		return (await response.json()) as T;
	}

	function buildObjectSubtitle(row: EmisObjectSummary) {
		const parts = [row.objectTypeName, row.region, row.countryCode].filter(Boolean);
		return parts.length ? parts.join(' • ') : null;
	}

	function buildNewsSubtitle(row: EmisNewsSummary) {
		const parts = [row.sourceName, row.newsType, row.region].filter(Boolean);
		return parts.length ? parts.join(' • ') : null;
	}

	let activeLayer = $derived.by((): 'all' | 'objects' | 'news' | 'vessels' => {
		const raw = $effectiveFilters.layer;
		return raw === 'objects' || raw === 'news' || raw === 'vessels' ? raw : 'all';
	});
	let isVesselMode = $derived(activeLayer === 'vessels');
	let selectedShipHbkId = $derived.by(() => {
		const raw = $effectiveFilters.shipHbkId;
		return typeof raw === 'string' ? raw : '';
	});
	let routeMode = $derived.by<RouteMode>(() => parseRouteMode($effectiveFilters.routeMode));
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
	let shipRoutePointFeatureCollection = $derived.by(
		(): GeoJSON.FeatureCollection<GeoJSON.Point> => ({
			type: 'FeatureCollection',
			features: (routeModeShowsPoints ? shipRoutePoints : []).map((point) => ({
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: [point.longitude, point.latitude]
				},
				properties: {
					routePointId: point.routePointId,
					shipHbkId: point.shipHbkId,
					vesselName: point.vesselName,
					pointSeqShip: point.pointSeqShip,
					fetchedAt: point.fetchedAt,
					speed: point.speed,
					course: point.course,
					heading: point.heading
				}
			}))
		})
	);
	let shipRouteSegmentFeatureCollection = $derived.by(
		(): GeoJSON.FeatureCollection<GeoJSON.LineString> => ({
			type: 'FeatureCollection',
			features: (routeModeShowsSegments ? shipRouteSegments : []).map((segment) => ({
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
					fromFetchedAt: segment.fromFetchedAt,
					gapMinutes: segment.gapMinutes,
					fromSpeed: segment.fromSpeed,
					fromCourse: segment.fromCourse
				}
			}))
		})
	);
	let latestShipRoutePoints = $derived.by(() =>
		routeModeShowsPoints ? [...shipRoutePoints].slice(-8).reverse() : []
	);

	let effectiveResultKind = $derived.by<SearchResultKind>(() => {
		if (activeLayer === 'objects') return 'objects';
		if (activeLayer === 'news') return 'news';
		return preferredResultKind;
	});

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
		const vesselFeature: EmisMapSelectedFeature = {
			id: String(vessel.shipHbkId),
			kind: 'vessel',
			title: vessel.vesselName,
			subtitle:
				[vessel.vesselType, vessel.flag, vessel.callsign].filter(Boolean).join(' · ') || null,
			colorKey: 'vessel',
			shipHbkId: vessel.shipHbkId,
			imo: vessel.imo,
			mmsi: vessel.mmsi,
			flag: vessel.flag,
			callsign: vessel.callsign,
			vesselType: vessel.vesselType,
			lastFetchedAt: vessel.lastFetchedAt,
			lastLatitude: vessel.lastLatitude!,
			lastLongitude: vessel.lastLongitude!,
			pointsCount: vessel.pointsCount,
			routeDaysCount: vessel.routeDaysCount
		};
		storeSelection(vesselFeature);
	}

	function clearSelection() {
		selectedFeature = null;
		selectionFilterSnapshot = null;
	}

	function buildRoutePointSelection(point: EmisShipRoutePoint): EmisMapSelectedRouteFeature {
		return {
			kind: 'route-point',
			routePointId: point.routePointId,
			shipHbkId: point.shipHbkId,
			vesselName: point.vesselName,
			pointSeqShip: point.pointSeqShip,
			fetchedAt: point.fetchedAt,
			latitude: point.latitude,
			longitude: point.longitude,
			speed: point.speed,
			course: point.course,
			heading: point.heading
		};
	}

	function buildRouteSegmentSelection(segment: EmisShipRouteSegment): EmisMapSelectedRouteFeature {
		return {
			kind: 'route-segment',
			shipHbkId: segment.shipHbkId,
			vesselName: segment.vesselName,
			segmentSeqShip: segment.segmentSeqShip,
			fromFetchedAt: segment.fromFetchedAt,
			fromLatitude: segment.fromLatitude,
			fromLongitude: segment.fromLongitude,
			toLatitude: segment.toLatitude,
			toLongitude: segment.toLongitude,
			gapMinutes: segment.gapMinutes,
			fromSpeed: segment.fromSpeed,
			fromCourse: segment.fromCourse
		};
	}

	function selectRoutePoint(point: EmisShipRoutePoint) {
		selectedRouteFeature = buildRoutePointSelection(point);
	}

	function selectRouteSegment(segment: EmisShipRouteSegment) {
		selectedRouteFeature = buildRouteSegmentSelection(segment);
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

			<Card>
				<CardHeader>
					<CardTitle>{isVesselMode ? 'Vessel Catalog' : 'Search Results'}</CardTitle>
					<CardDescription>
						{isVesselMode
							? 'Каталог судов из mart.emis_ship_route_vessels. Выберите судно для центрирования на карте.'
							: 'Тонкий transport над `listObjectsQuery(...)` и `listNewsQuery(...)`.'}
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4">
					{#if isVesselMode}
						<div class="flex items-center justify-between gap-3">
							<div class="type-caption text-muted-foreground">
								Vessels: <span class="font-mono">{shipRouteCatalog.length}</span>
							</div>
							<Button
								variant="outline"
								size="sm"
								onclick={() => void loadShipRouteCatalog()}
								disabled={shipRouteCatalogLoading}
							>
								{shipRouteCatalogLoading ? 'Loading...' : 'Reload'}
							</Button>
						</div>

						{#if shipRouteCatalogError}
							<div
								class="type-body-sm rounded-xl border border-error/30 bg-error-muted/30 p-3 text-error"
							>
								{shipRouteCatalogError}
							</div>
						{:else if shipRouteCatalogLoading && shipRouteCatalog.length === 0}
							<div class="space-y-3">
								{#each { length: 4 } as _}
									<div class="space-y-2 rounded-xl border border-border/70 p-3">
										<Skeleton class="h-4 w-2/3" />
										<Skeleton class="h-3 w-1/3" />
									</div>
								{/each}
							</div>
						{:else if shipRouteCatalog.length === 0}
							<div class="type-body-sm text-muted-foreground">Суда не найдены.</div>
						{:else}
							<div class="max-h-[600px] space-y-3 overflow-y-auto">
								{#each shipRouteCatalog as vessel (vessel.shipHbkId)}
									{@const isActive =
										selectedFeature?.kind === 'vessel' &&
										selectedFeature.id === String(vessel.shipHbkId)}
									<button
										type="button"
										class={`w-full rounded-xl border p-3 text-left transition-colors ${
											isActive
												? 'border-info/40 bg-info-muted/30'
												: 'border-border/70 bg-muted/10 hover:bg-muted/20'
										}`}
										onclick={() => selectVesselFromCatalog(vessel)}
									>
										<div class="flex items-start justify-between gap-3">
											<div>
												<div class="type-body-sm font-medium text-foreground">
													{vessel.vesselName}
												</div>
												<div class="type-caption text-muted-foreground">
													HBK {vessel.shipHbkId}
													{#if vessel.imo}
														<span class="mx-1">·</span>IMO {vessel.imo}
													{/if}
													{#if vessel.mmsi}
														<span class="mx-1">·</span>MMSI {vessel.mmsi}
													{/if}
												</div>
											</div>
											<div class="type-caption shrink-0 text-right text-muted-foreground">
												{#if vessel.lastLatitude != null && vessel.lastLongitude != null}
													<div>
														{formatCoordinate(vessel.lastLatitude)}, {formatCoordinate(
															vessel.lastLongitude
														)}
													</div>
												{/if}
												<div>{vessel.pointsCount} pts / {vessel.routeDaysCount} days</div>
											</div>
										</div>
										{#if vessel.flag || vessel.callsign || vessel.vesselType}
											<div class="type-caption mt-1 text-muted-foreground">
												{[vessel.vesselType, vessel.flag, vessel.callsign]
													.filter(Boolean)
													.join(' · ')}
											</div>
										{/if}
										<div class="type-caption mt-1 text-muted-foreground">
											Last seen: {formatDate(vessel.lastFetchedAt)}
										</div>
									</button>
								{/each}
							</div>
						{/if}
					{:else}
						<div class="flex items-center justify-between gap-3">
							<div class="type-caption text-muted-foreground">
								Target: <span class="font-mono">{effectiveResultKind}</span>
							</div>
							<div class="type-caption text-muted-foreground">
								Rows: {resultsMeta?.count ?? 0}
							</div>
						</div>

						{#if selectedFeature}
							<div class="rounded-xl border border-info/30 bg-info-muted/30 p-3">
								<div class="flex items-start justify-between gap-3">
									<div class="space-y-1">
										<div class="type-caption tracking-[0.16em] text-info uppercase">
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
									<div class="flex items-center gap-2">
										{#if getSelectedFeatureHref(selectedFeature)}
											<a
												class="type-caption font-medium text-primary underline underline-offset-4"
												href={getSelectedFeatureHref(selectedFeature)}
											>
												Открыть карточку
											</a>
										{/if}
										<Button variant="ghost" size="sm" onclick={clearSelection}>Сбросить</Button>
									</div>
								</div>

								<div class="type-caption mt-3 grid gap-1 text-muted-foreground">
									{#if selectedFeature.kind === 'object'}
										<div>
											Status: <span class="font-medium text-foreground"
												>{selectedFeature.status}</span
											>
										</div>
										<div>
											Updated:
											<span class="font-medium text-foreground">
												{formatDate(selectedFeature.updatedAt)}
											</span>
										</div>
									{:else if selectedFeature.kind === 'news'}
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
									{:else if selectedFeature.kind === 'vessel'}
										<div>
											HBK: <span class="font-medium text-foreground"
												>{selectedFeature.shipHbkId}</span
											>
										</div>
										{#if selectedFeature.imo}
											<div>
												IMO: <span class="font-medium text-foreground">{selectedFeature.imo}</span>
											</div>
										{/if}
										{#if selectedFeature.mmsi}
											<div>
												MMSI: <span class="font-medium text-foreground">{selectedFeature.mmsi}</span
												>
											</div>
										{/if}
										<div>
											Last seen:
											<span class="font-medium text-foreground">
												{formatDate(selectedFeature.lastFetchedAt)}
											</span>
										</div>
									{/if}
								</div>
							</div>
						{/if}

						{#if resultsError}
							<div
								class="type-body-sm rounded-xl border border-error/30 bg-error-muted/30 p-3 text-error"
							>
								{resultsError}
							</div>
						{:else if resultsLoader.loading && effectiveResultKind === 'objects' && objectRows.length === 0}
							<div class="space-y-3">
								{#each { length: 4 } as _}
									<div class="space-y-2 rounded-xl border border-border/70 p-3">
										<Skeleton class="h-4 w-2/3" />
										<Skeleton class="h-3 w-1/3" />
									</div>
								{/each}
							</div>
						{:else if resultsLoader.loading && effectiveResultKind === 'news' && newsRows.length === 0}
							<div class="space-y-3">
								{#each { length: 4 } as _}
									<div class="space-y-2 rounded-xl border border-border/70 p-3">
										<Skeleton class="h-4 w-3/4" />
										<Skeleton class="h-3 w-1/2" />
										<Skeleton class="h-3 w-1/4" />
									</div>
								{/each}
							</div>
						{:else if effectiveResultKind === 'objects'}
							<div class="space-y-3">
								{#if objectRows.length === 0}
									<div class="type-body-sm text-muted-foreground">
										По текущим фильтрам объекты не найдены.
									</div>
								{:else}
									{#each objectRows as row (row.id)}
										<div
											class={`rounded-xl border p-3 transition-colors ${
												isSelectedObject(row.id)
													? 'border-info/40 bg-info-muted/30'
													: 'border-border/70 bg-muted/10 hover:bg-muted/20'
											}`}
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
											<div class="type-caption mt-2 text-muted-foreground">
												UUID: <span class="font-mono">{row.id}</span>
											</div>
											<div class="type-caption mt-1 text-muted-foreground">
												Updated: {formatDate(row.updatedAt)}
											</div>
											<div class="mt-4 flex flex-wrap items-center gap-3">
												<Button variant="outline" size="sm" onclick={() => selectObjectRow(row)}>
													Выбрать
												</Button>
												<a
													class="type-caption font-medium text-primary underline underline-offset-4"
													href={getObjectDetailHref(row.id)}
												>
													Открыть карточку
												</a>
											</div>
										</div>
									{/each}
								{/if}
							</div>
						{:else}
							<div class="space-y-3">
								{#if newsRows.length === 0}
									<div class="type-body-sm text-muted-foreground">
										По текущим фильтрам новости не найдены.
									</div>
								{:else}
									{#each newsRows as row (row.id)}
										<div
											class={`rounded-xl border p-3 transition-colors ${
												isSelectedNews(row.id)
													? 'border-info/40 bg-info-muted/30'
													: 'border-border/70 bg-muted/10 hover:bg-muted/20'
											}`}
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
											<div class="type-caption mt-2 text-muted-foreground">
												Published: {formatDate(row.publishedAt)}
											</div>
											<div class="mt-4 flex flex-wrap items-center gap-3">
												<Button variant="outline" size="sm" onclick={() => selectNewsRow(row)}>
													Выбрать
												</Button>
												<a
													class="type-caption font-medium text-primary underline underline-offset-4"
													href={getNewsDetailHref(row.id)}
												>
													Открыть карточку
												</a>
											</div>
										</div>
									{/each}
								{/if}
							</div>
						{/if}
					{/if}
				</CardContent>
			</Card>
		</div>

		{#if !isVesselMode}
			<div class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
				<Card>
					<CardHeader>
						<CardTitle>Ship Route Slice</CardTitle>
						<CardDescription>
							Живой vertical slice поверх прямых `/api/emis/ship-routes/*` queries. Используем
							`shipHbkId` как главный идентификатор и переиспользуем общий `dateRange`, если он
							задан в workspace filters.
						</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
							<FilterPanel
								runtime={filterRuntime}
								scope="workspace"
								direction="horizontal"
								filterIds={[...EMIS_SHIP_ROUTE_FILTER_IDS, 'routeMode']}
							/>
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
									onclick={shipRouteLoader.reload}
									disabled={shipRouteLoader.loading || !selectedShipHbkId}
								>
									{shipRouteLoader.loading ? 'Обновляем трек...' : 'Обновить трек'}
								</Button>
							</div>
						</div>

						{#if shipRouteCatalogError}
							<div
								class="type-body-sm rounded-xl border border-error/30 bg-error-muted/30 p-3 text-error"
							>
								{shipRouteCatalogError}
							</div>
						{/if}

						{#if selectedShipRouteVessel}
							<div
								class="grid gap-3 rounded-xl border border-border/70 bg-muted/10 p-4 md:grid-cols-2 xl:grid-cols-4"
							>
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
										{formatDate(selectedShipRouteVessel.lastFetchedAt)}
									</div>
									<div class="type-caption text-muted-foreground">
										First seen: {selectedShipRouteVessel.firstFetchedAt
											? formatDate(selectedShipRouteVessel.firstFetchedAt)
											: 'n/a'}
									</div>
								</div>
								<div>
									<div class="type-caption text-muted-foreground">Track shape</div>
									<div
										class="type-body-sm flex flex-wrap items-baseline gap-x-1 font-medium text-foreground"
									>
										{routeModeShowsPoints ? shipRoutePoints.length : 0} points
										{#if routeModeShowsPoints && shipRoutePoints.length >= SHIP_ROUTE_LIMIT}
											<span
												class="rounded border border-warning/30 bg-warning-muted/40 px-1 py-0.5 text-[10px] font-normal text-warning-foreground"
												>max</span
											>
										{/if}
										/
										{routeModeShowsSegments ? shipRouteSegments.length : 0} segments
										{#if routeModeShowsSegments && shipRouteSegments.length >= SHIP_ROUTE_LIMIT}
											<span
												class="rounded border border-warning/30 bg-warning-muted/40 px-1 py-0.5 text-[10px] font-normal text-warning-foreground"
												>max</span
											>
										{/if}
									</div>
									<div class="type-caption text-muted-foreground">
										Mode: {routeMode} • Catalog: {selectedShipRouteVessel.pointsCount} points /
										{selectedShipRouteVessel.routeDaysCount} days
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
									<div class="type-caption text-muted-foreground">
										Last pos:
										{selectedShipRouteVessel.lastLatitude !== null &&
										selectedShipRouteVessel.lastLongitude !== null
											? `${formatCoordinate(selectedShipRouteVessel.lastLatitude)}, ${formatCoordinate(selectedShipRouteVessel.lastLongitude)}`
											: 'n/a'}
									</div>
								</div>
							</div>
						{/if}

						{#if selectedRouteFeature}
							<div class="rounded-xl border border-info/30 bg-info-muted/20 p-4">
								<div class="flex flex-wrap items-start justify-between gap-3">
									<div class="space-y-1">
										<div class="type-caption tracking-[0.16em] text-info uppercase">
											Selected {selectedRouteFeature.kind === 'route-point'
												? 'route point'
												: 'route segment'}
										</div>
										<div class="type-body-sm font-medium text-foreground">
											{selectedRouteFeature.vesselName}
										</div>
										<div class="type-caption text-muted-foreground">
											{#if selectedRouteFeature.kind === 'route-point'}
												Seq #{selectedRouteFeature.pointSeqShip} • {formatDate(
													selectedRouteFeature.fetchedAt
												)}
											{:else}
												Segment #{selectedRouteFeature.segmentSeqShip} • {formatDate(
													selectedRouteFeature.fromFetchedAt
												)}
											{/if}
										</div>
									</div>
									<Button variant="ghost" size="sm" onclick={clearRouteSelection}>Сбросить</Button>
								</div>
								<div class="type-caption mt-3 grid gap-1 text-muted-foreground">
									{#if selectedRouteFeature.kind === 'route-point'}
										<div>
											Coords:
											<span class="font-medium text-foreground">
												{formatCoordinate(selectedRouteFeature.latitude)},
												{formatCoordinate(selectedRouteFeature.longitude)}
											</span>
										</div>
										<div>
											Speed/Course:
											<span class="font-medium text-foreground">
												{formatMetric(selectedRouteFeature.speed, ' kn')} /
												{formatMetric(selectedRouteFeature.course)}
											</span>
										</div>
									{:else}
										<div>
											From:
											<span class="font-medium text-foreground">
												{formatCoordinate(selectedRouteFeature.fromLatitude)},
												{formatCoordinate(selectedRouteFeature.fromLongitude)}
											</span>
										</div>
										<div>
											To:
											<span class="font-medium text-foreground">
												{formatCoordinate(selectedRouteFeature.toLatitude)},
												{formatCoordinate(selectedRouteFeature.toLongitude)}
											</span>
										</div>
										<div>
											Gap:
											<span class="font-medium text-foreground">
												{formatMetric(selectedRouteFeature.gapMinutes, ' min')}
											</span>
										</div>
									{/if}
								</div>
							</div>
						{/if}

						{#if shipRouteError}
							<div
								class="type-body-sm rounded-xl border border-error/30 bg-error-muted/30 p-3 text-error"
							>
								{shipRouteError}
							</div>
						{:else if shipRouteLoader.loading && !shipRoutePoints.length}
							<div class="space-y-3">
								{#each { length: 3 } as _}
									<div class="space-y-2 rounded-xl border border-border/70 p-3">
										<Skeleton class="h-3 w-1/4" />
										<Skeleton class="h-4 w-1/2" />
									</div>
								{/each}
							</div>
						{:else if !selectedShipHbkId}
							<div class="type-body-sm text-muted-foreground">
								Выберите судно через route filter, чтобы открыть ship-track preview.
							</div>
						{:else if routeModeShowsPoints && shipRoutePoints.length === 0}
							<div class="type-body-sm text-muted-foreground">
								По выбранному судну и текущему периоду маршрутных точек не найдено.
							</div>
						{:else if !routeModeShowsPoints && routeModeShowsSegments && shipRouteSegments.length === 0}
							<div class="type-body-sm text-muted-foreground">
								По выбранному судну и текущему периоду маршрутных сегментов не найдено.
							</div>
						{:else}
							<div class="grid gap-3 md:grid-cols-3">
								<div class="rounded-xl border border-border/70 bg-background/80 p-3">
									<div class="type-caption text-muted-foreground">
										{routeModeShowsPoints ? 'First point' : 'First segment'}
									</div>
									<div class="type-body-sm font-medium text-foreground">
										{routeModeShowsPoints
											? formatDate(shipRoutePoints[0].fetchedAt)
											: formatDate(shipRouteSegments[0].fromFetchedAt)}
									</div>
									<div class="type-caption text-muted-foreground">
										{routeModeShowsPoints
											? `${formatCoordinate(shipRoutePoints[0].latitude)}, ${formatCoordinate(shipRoutePoints[0].longitude)}`
											: `${formatCoordinate(shipRouteSegments[0].fromLatitude)}, ${formatCoordinate(shipRouteSegments[0].fromLongitude)}`}
									</div>
								</div>
								<div class="rounded-xl border border-border/70 bg-background/80 p-3">
									<div class="type-caption text-muted-foreground">
										{routeModeShowsPoints ? 'Last point' : 'Last segment'}
									</div>
									<div class="type-body-sm font-medium text-foreground">
										{routeModeShowsPoints
											? formatDate(shipRoutePoints[shipRoutePoints.length - 1].fetchedAt)
											: formatDate(shipRouteSegments[shipRouteSegments.length - 1].fromFetchedAt)}
									</div>
									<div class="type-caption text-muted-foreground">
										{routeModeShowsPoints
											? `${formatCoordinate(shipRoutePoints[shipRoutePoints.length - 1].latitude)}, ${formatCoordinate(shipRoutePoints[shipRoutePoints.length - 1].longitude)}`
											: `${formatCoordinate(shipRouteSegments[shipRouteSegments.length - 1].fromLatitude)}, ${formatCoordinate(shipRouteSegments[shipRouteSegments.length - 1].fromLongitude)}`}
									</div>
								</div>
								<div class="rounded-xl border border-border/70 bg-background/80 p-3">
									<div class="type-caption text-muted-foreground">
										{routeModeShowsPoints ? 'Latest speed' : 'Latest segment gap'}
									</div>
									<div class="type-body-sm font-medium text-foreground">
										{routeModeShowsPoints
											? formatMetric(shipRoutePoints[shipRoutePoints.length - 1].speed, ' kn')
											: formatMetric(
													shipRouteSegments[shipRouteSegments.length - 1].gapMinutes,
													' min'
												)}
									</div>
									<div class="type-caption text-muted-foreground">
										{routeModeShowsPoints
											? `Gap from prev: ${formatMetric(shipRoutePoints[shipRoutePoints.length - 1].gapMinutesFromPrev, ' min')}`
											: `Start speed/course: ${formatMetric(shipRouteSegments[shipRouteSegments.length - 1].fromSpeed, ' kn')} / ${formatMetric(shipRouteSegments[shipRouteSegments.length - 1].fromCourse)}`}
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
								{#if !routeModeShowsPoints}
									Сейчас выбран `routeMode={routeMode}`, поэтому список последних точек скрыт.
								{:else}
									Здесь появятся точки, как только выберем судно и загрузим маршрут.
								{/if}
							</div>
						{:else}
							{#each latestShipRoutePoints as point (point.routePointId)}
								<div class="rounded-xl border border-border/70 bg-muted/10 p-3">
									<div
										class={`rounded-xl transition-colors ${
											isSelectedRoutePoint(point.routePointId) ? 'bg-info-muted/20' : ''
										}`}
									>
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
										<div class="type-caption mt-2 grid gap-1 text-muted-foreground">
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
										<div class="mt-3 flex flex-wrap items-center gap-3">
											<Button variant="outline" size="sm" onclick={() => selectRoutePoint(point)}>
												Выбрать
											</Button>
											<div class="type-caption text-muted-foreground">
												routePointId: <span class="font-mono">{point.routePointId}</span>
											</div>
										</div>
									</div>
								</div>
							{/each}
						{/if}
					</CardContent>
				</Card>
			</div>
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
