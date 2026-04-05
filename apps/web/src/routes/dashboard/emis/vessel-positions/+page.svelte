<script lang="ts">
	import type { PageData } from './$types';

	import type {
		EmisMapSelectedFeature,
		EmisMapNewsFeatureProperties
	} from '@dashboard-builder/emis-contracts/emis-map';
	import type { EmisShipRouteVessel } from '@dashboard-builder/emis-contracts/emis-ship-route';
	import { useFilterWorkspace } from '@dashboard-builder/platform-filters';
	import { formatCompact, formatDate, formatNumber } from '@dashboard-builder/platform-core';
	import { EmisDrawer } from '$widgets/emis-drawer';
	import { EmisMap } from '@dashboard-builder/emis-ui/emis-map';
	import { EmisStatusBar } from '@dashboard-builder/emis-ui/emis-status-bar';

	import { vesselPositionsFilters, VESSEL_POSITIONS_FILTER_TARGETS } from './filters';

	type VesselRow = EmisShipRouteVessel & { vesselLabel: string };
	type NewsRow = EmisMapNewsFeatureProperties;
	type CatalogTab = 'vessels' | 'news';
	type LayerMode = 'vessels' | 'news' | 'vessels+news';

	let { data }: { data: PageData } = $props();

	const filterRuntime = useFilterWorkspace({
		workspaceId: 'dashboard-emis',
		ownerId: 'vessel-positions',
		specs: vesselPositionsFilters
	});
	let effectiveFilters = $derived(filterRuntime.effective);

	type FlyToTarget = { lng: number; lat: number; zoom?: number } | null;

	let vessels = $state<VesselRow[]>([]);
	let newsItems = $state<NewsRow[]>([]);
	let viewportVesselCount = $state<number | null>(null);
	let viewportNewsCount = $state<number | null>(null);
	let catalogError = $state<string | null>(null);
	let selectedFeature = $state<EmisMapSelectedFeature | null>(null);
	let expandedHbkId = $state<number | null>(null);
	let expandedNewsId = $state<string | null>(null);
	let flyToTarget = $state<FlyToTarget>(null);
	let activeCatalogTab = $state<CatalogTab>('vessels');

	let activeLayer = $derived.by((): LayerMode => {
		const raw = $effectiveFilters.layer;
		return raw === 'vessels' || raw === 'news' || raw === 'vessels+news' ? raw : 'vessels+news';
	});
	let showVessels = $derived(activeLayer === 'vessels' || activeLayer === 'vessels+news');
	let showNews = $derived(activeLayer === 'news' || activeLayer === 'vessels+news');

	let mapVesselsQuery = $derived.by(() =>
		filterRuntime.getServerParams(VESSEL_POSITIONS_FILTER_TARGETS.mapVessels)
	);
	let mapNewsQuery = $derived.by(() =>
		filterRuntime.getServerParams(VESSEL_POSITIONS_FILTER_TARGETS.mapNews)
	);
	let selectedFeatureRef = $derived(
		selectedFeature ? { id: selectedFeature.id, kind: selectedFeature.kind } : null
	);

	let vesselsWithCoords = $derived(
		vessels.filter((v) => v.lastLatitude != null && v.lastLongitude != null).length
	);
	let latestFetch = $derived.by(() => {
		if (!vessels.length) return null;
		return vessels.reduce(
			(latest, v) => (v.lastFetchedAt > latest ? v.lastFetchedAt : latest),
			vessels[0].lastFetchedAt
		);
	});
	let totalPoints = $derived(vessels.reduce((sum, v) => sum + v.pointsCount, 0));

	// Auto-switch catalog tab and clear stale data when layer changes
	$effect(() => {
		if (activeLayer === 'vessels') {
			activeCatalogTab = 'vessels';
			newsItems = [];
			viewportNewsCount = null;
		}
		if (activeLayer === 'news') {
			activeCatalogTab = 'news';
			vessels = [];
			viewportVesselCount = null;
		}
	});

	function formatCoord(value: number) {
		return value.toFixed(4);
	}

	function importanceBadge(importance: number | null): { label: string; tone: string } {
		switch (importance) {
			case 5:
				return { label: 'critical', tone: 'bg-error/15 text-error border-error/30' };
			case 4:
				return {
					label: 'high',
					tone: 'bg-destructive-hover/15 text-destructive-hover border-destructive-hover/30'
				};
			case 3:
				return { label: 'medium', tone: 'bg-warning/15 text-warning border-warning/30' };
			case 2:
				return { label: 'low', tone: 'bg-info/15 text-info border-info/30' };
			case 1:
				return { label: 'minor', tone: 'bg-success/15 text-success border-success/30' };
			default:
				return { label: 'n/a', tone: 'bg-muted/50 text-muted-foreground border-border/60' };
		}
	}

	function buildVesselFeature(vessel: VesselRow): EmisMapSelectedFeature | null {
		if (vessel.lastLatitude == null || vessel.lastLongitude == null) return null;
		return {
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
			lastLatitude: vessel.lastLatitude,
			lastLongitude: vessel.lastLongitude,
			pointsCount: vessel.pointsCount,
			routeDaysCount: vessel.routeDaysCount
		};
	}

	function toggleVessel(vessel: VesselRow) {
		if (expandedHbkId === vessel.shipHbkId) {
			expandedHbkId = null;
			selectedFeature = null;
			flyToTarget = null;
		} else {
			expandedHbkId = vessel.shipHbkId;
			expandedNewsId = null;
			selectedFeature = buildVesselFeature(vessel);
			if (vessel.lastLatitude != null && vessel.lastLongitude != null) {
				flyToTarget = { lng: vessel.lastLongitude, lat: vessel.lastLatitude, zoom: 6 };
			}
		}
	}

	function toggleNews(news: NewsRow) {
		if (expandedNewsId === news.id) {
			expandedNewsId = null;
			selectedFeature = null;
		} else {
			expandedNewsId = news.id;
			expandedHbkId = null;
			selectedFeature = news;
		}
	}

	function handleMapFeatureSelect(feature: EmisMapSelectedFeature) {
		selectedFeature = feature;
		if (feature.kind === 'vessel') {
			expandedHbkId = Number(feature.id);
			expandedNewsId = null;
			activeCatalogTab = 'vessels';
		} else if (feature.kind === 'news') {
			expandedNewsId = feature.id;
			expandedHbkId = null;
			activeCatalogTab = 'news';
		}
	}

	function clearSelection() {
		selectedFeature = null;
		expandedHbkId = null;
		expandedNewsId = null;
		flyToTarget = null;
	}

	function handleVesselsLoaded(loaded: { features: GeoJSON.Feature[]; total: number }) {
		viewportVesselCount = loaded.total;
		vessels = loaded.features.map((f) => {
			const p = f.properties as Record<string, unknown>;
			return {
				shipHbkId: Number(p.shipHbkId),
				shipId: null,
				vesselName: String(p.title ?? ''),
				vesselType: typeof p.vesselType === 'string' ? p.vesselType : null,
				flag: typeof p.flag === 'string' ? p.flag : null,
				callsign: typeof p.callsign === 'string' ? p.callsign : null,
				imo: typeof p.imo === 'number' ? p.imo : null,
				mmsi: typeof p.mmsi === 'number' ? p.mmsi : null,
				firstFetchedAt: null,
				lastFetchedAt: String(p.lastFetchedAt ?? ''),
				lastRouteDateUtc: null,
				pointsCount: typeof p.pointsCount === 'number' ? p.pointsCount : 0,
				routeDaysCount: typeof p.routeDaysCount === 'number' ? p.routeDaysCount : 0,
				lastLatitude: typeof p.lastLatitude === 'number' ? p.lastLatitude : null,
				lastLongitude: typeof p.lastLongitude === 'number' ? p.lastLongitude : null,
				vesselLabel: `${p.title} · HBK ${p.shipHbkId}`
			};
		});
		catalogError = null;
	}

	function handleNewsLoaded(loaded: { features: GeoJSON.Feature[]; total: number }) {
		viewportNewsCount = loaded.total;
		newsItems = loaded.features.map((f) => {
			const p = f.properties as Record<string, unknown>;
			return {
				id: String(p.id ?? ''),
				kind: 'news' as const,
				title: String(p.title ?? ''),
				subtitle: typeof p.subtitle === 'string' ? p.subtitle : null,
				colorKey: typeof p.colorKey === 'string' ? p.colorKey : 'news',
				sourceId: String(p.sourceId ?? ''),
				sourceName: String(p.sourceName ?? ''),
				countryCode: typeof p.countryCode === 'string' ? p.countryCode : null,
				region: typeof p.region === 'string' ? p.region : null,
				newsType: typeof p.newsType === 'string' ? p.newsType : null,
				importance: typeof p.importance === 'number' ? p.importance : null,
				publishedAt: String(p.publishedAt ?? ''),
				relatedObjectsCount: typeof p.relatedObjectsCount === 'number' ? p.relatedObjectsCount : 0,
				summary: typeof p.summary === 'string' ? p.summary : null,
				url: typeof p.url === 'string' ? p.url : null
			};
		});
	}

	function searchFilter(vessel: VesselRow, q: string): boolean {
		const lower = q.toLowerCase();
		return (
			vessel.vesselName.toLowerCase().includes(lower) ||
			String(vessel.shipHbkId).includes(lower) ||
			(vessel.imo != null && String(vessel.imo).includes(lower)) ||
			(vessel.mmsi != null && String(vessel.mmsi).includes(lower)) ||
			(vessel.callsign?.toLowerCase().includes(lower) ?? false)
		);
	}

	let searchQ = $derived.by(() => {
		const raw = $effectiveFilters.q;
		return typeof raw === 'string' && raw.trim() ? raw.trim() : '';
	});
	let filterFlag = $derived.by(() => {
		const raw = $effectiveFilters.flag;
		return typeof raw === 'string' && raw.trim() ? raw.trim().toLowerCase() : '';
	});
	let filterVesselType = $derived.by(() => {
		const raw = $effectiveFilters.vesselType;
		return typeof raw === 'string' && raw.trim() ? raw.trim().toLowerCase() : '';
	});
	let hasActiveVesselFilters = $derived(!!searchQ || !!filterFlag || !!filterVesselType);
	let filteredVessels = $derived.by(() => {
		let result = vessels;
		if (searchQ) result = result.filter((v) => searchFilter(v, searchQ));
		if (filterFlag) result = result.filter((v) => v.flag?.toLowerCase().includes(filterFlag));
		if (filterVesselType)
			result = result.filter((v) => v.vesselType?.toLowerCase().includes(filterVesselType));
		return result;
	});

	let catalogLoading = $state(false);

	// --- New state for map-first layout ---

	let drawerOpen = $state(false);

	function toggleDrawer() {
		drawerOpen = !drawerOpen;
	}

	function handleTabChange(tab: CatalogTab) {
		activeCatalogTab = tab;
	}

	// Layer toggle handlers for the status bar
	function toggleVesselsLayer() {
		const current = activeLayer;
		if (current === 'vessels+news') {
			filterRuntime.setFilter('layer', 'news');
		} else if (current === 'vessels') {
			filterRuntime.setFilter('layer', 'news');
		} else if (current === 'news') {
			filterRuntime.setFilter('layer', 'vessels+news');
		}
	}

	function toggleNewsLayer() {
		const current = activeLayer;
		if (current === 'vessels+news') {
			filterRuntime.setFilter('layer', 'vessels');
		} else if (current === 'news') {
			filterRuntime.setFilter('layer', 'vessels');
		} else if (current === 'vessels') {
			filterRuntime.setFilter('layer', 'vessels+news');
		}
	}
</script>

<svelte:head>
	<title>Vessel Positions & News — EMIS</title>
	<meta
		name="description"
		content="Current vessel positions and maritime news from EMIS database."
	/>
</svelte:head>

<div class="flex h-[calc(100vh-3rem)] flex-col">
	<!-- Compact header -->
	<header
		class="flex items-center justify-between border-b border-border/60 bg-background px-4 py-2"
	>
		<div class="flex items-center gap-3">
			<div class="type-caption tracking-[0.24em] text-muted-foreground uppercase">EMIS BI</div>
			<h1 class="type-body-sm font-semibold">Vessel Positions & News</h1>
		</div>
		<nav class="type-caption flex items-center gap-3 text-muted-foreground">
			<a class="underline underline-offset-4" href="/dashboard/emis">Overview</a>
			<a class="underline underline-offset-4" href="/dashboard/emis/provenance">Provenance</a>
			<a class="underline underline-offset-4" href="/dashboard/emis/ship-routes">Ship Routes BI</a>
			<a class="underline underline-offset-4" href="/emis">Workspace</a>
		</nav>
	</header>

	<!-- Status bar (replaces StatCards) -->
	<EmisStatusBar
		vesselCount={vessels.length}
		{vesselsWithCoords}
		newsCount={viewportNewsCount}
		{totalPoints}
		{latestFetch}
		{catalogLoading}
		{showVessels}
		{showNews}
		onToggleVessels={toggleVesselsLayer}
		onToggleNews={toggleNewsLayer}
	/>

	<!-- Map + drawer in a flex row -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Map fills remaining space -->
		<div class="relative min-w-0 flex-1">
			<EmisMap
				mapConfig={data.mapConfig}
				vesselsQuery={mapVesselsQuery}
				newsQuery={mapNewsQuery}
				layer={activeLayer}
				selectedFeature={selectedFeatureRef}
				{flyToTarget}
				onFeatureSelect={handleMapFeatureSelect}
				onVesselsLoaded={handleVesselsLoaded}
				onNewsLoaded={handleNewsLoaded}
				diagnostics={false}
				showFitBounds={true}
				mapHeight="h-full"
				class="h-full"
			/>
		</div>

		<!-- Drawer (mini-bar + optional expanded panel) — in document flow -->
		<EmisDrawer
			open={drawerOpen}
			onToggle={toggleDrawer}
			{activeCatalogTab}
			onTabChange={handleTabChange}
			{showVessels}
			{showNews}
			{vessels}
			{filteredVessels}
			{hasActiveVesselFilters}
			{expandedHbkId}
			onToggleVessel={toggleVessel}
			{catalogLoading}
			{catalogError}
			{newsItems}
			{expandedNewsId}
			onToggleNews={toggleNews}
			{filterRuntime}
		/>
	</div>
</div>
