<script lang="ts">
	import type { EmisMapSelectedRouteFeature } from '@dashboard-builder/emis-contracts/emis-map';
	import type { EmisShipRoutePoint } from '@dashboard-builder/emis-contracts/emis-ship-route';
	import type { FilterWorkspaceRuntime } from '@dashboard-builder/platform-filters';
	import { Button } from '@dashboard-builder/platform-ui';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@dashboard-builder/platform-ui';
	import { Skeleton } from '@dashboard-builder/platform-ui';
	import { FilterPanel } from '@dashboard-builder/platform-filters/widgets';

	import type { ShipRouteVesselOption } from './emisPageSelection';
	import type { EmisShipRouteSegment } from '@dashboard-builder/emis-contracts/emis-ship-route';
	import type { RouteMode } from './emisPageHelpers';
	import { formatDate, formatCoordinate, formatMetric, SHIP_ROUTE_LIMIT } from './emisPageHelpers';
	import { EMIS_SHIP_ROUTE_FILTER_IDS } from './filters';

	let {
		filterRuntime,
		shipRouteCatalogLoading,
		shipRouteCatalogError,
		loadShipRouteCatalog,
		shipRouteLoaderLoading,
		shipRouteLoaderReload,
		selectedShipHbkId,
		selectedShipRouteVessel,
		routeMode,
		routeModeShowsPoints,
		routeModeShowsSegments,
		shipRoutePoints,
		shipRouteSegments,
		selectedRouteFeature,
		clearRouteSelection,
		shipRouteError,
		latestShipRoutePoints,
		isSelectedRoutePoint,
		selectRoutePoint
	}: {
		filterRuntime: FilterWorkspaceRuntime;
		shipRouteCatalogLoading: boolean;
		shipRouteCatalogError: string | null;
		loadShipRouteCatalog: () => void;
		shipRouteLoaderLoading: boolean;
		shipRouteLoaderReload: () => void;
		selectedShipHbkId: string;
		selectedShipRouteVessel: ShipRouteVesselOption | null;
		routeMode: RouteMode;
		routeModeShowsPoints: boolean;
		routeModeShowsSegments: boolean;
		shipRoutePoints: EmisShipRoutePoint[];
		shipRouteSegments: EmisShipRouteSegment[];
		selectedRouteFeature: EmisMapSelectedRouteFeature | null;
		clearRouteSelection: () => void;
		shipRouteError: string | null;
		latestShipRoutePoints: EmisShipRoutePoint[];
		isSelectedRoutePoint: (routePointId: number) => boolean;
		selectRoutePoint: (point: EmisShipRoutePoint) => void;
	} = $props();
</script>

<div class="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
	<Card>
		<CardHeader>
			<CardTitle>Ship Route Slice</CardTitle>
			<CardDescription>
				Живой vertical slice поверх прямых `/api/emis/ship-routes/*` queries. Используем `shipHbkId`
				как главный идентификатор и переиспользуем общий `dateRange`, если он задан в workspace
				filters.
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
						onclick={() => loadShipRouteCatalog()}
						disabled={shipRouteCatalogLoading}
					>
						{shipRouteCatalogLoading ? 'Обновляем суда...' : 'Обновить суда'}
					</Button>
				</div>
				<div class="flex items-end">
					<Button
						variant="outline"
						onclick={shipRouteLoaderReload}
						disabled={shipRouteLoaderLoading || !selectedShipHbkId}
					>
						{shipRouteLoaderLoading ? 'Обновляем трек...' : 'Обновить трек'}
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
			{:else if shipRouteLoaderLoading && !shipRoutePoints.length}
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
								: formatMetric(shipRouteSegments[shipRouteSegments.length - 1].gapMinutes, ' min')}
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
				Последние точки выбранного маршрута. Этого достаточно, чтобы быстро проверить, нормально ли
				`mart_emis` ложится в текущий workspace.
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
