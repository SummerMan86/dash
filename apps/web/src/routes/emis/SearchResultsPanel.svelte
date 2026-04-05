<script lang="ts">
	import type { EmisMapSelectedFeature } from '$entities/emis-map';
	import type { EmisNewsSummary } from '$entities/emis-news';
	import type { EmisObjectSummary } from '$entities/emis-object';
	import { Button } from '$shared/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$shared/ui/card';
	import { Skeleton } from '$shared/ui/skeleton';

	import type { ShipRouteVesselOption } from './emisPageSelection';
	import type { SearchResultKind } from './emisPageHelpers';
	import { formatDate, formatCoordinate } from './emisPageHelpers';
	import {
		getObjectDetailHref,
		getNewsDetailHref,
		getSelectedFeatureHref
	} from './emisPageSelection';

	let {
		isVesselMode,
		effectiveResultKind,
		shipRouteCatalog,
		shipRouteCatalogLoading,
		shipRouteCatalogError,
		loadShipRouteCatalog,
		selectedFeature,
		objectRows,
		newsRows,
		resultsLoaderLoading,
		resultsError,
		resultsMeta,
		selectVesselFromCatalog,
		selectObjectRow,
		selectNewsRow,
		clearSelection
	}: {
		isVesselMode: boolean;
		effectiveResultKind: SearchResultKind;
		shipRouteCatalog: ShipRouteVesselOption[];
		shipRouteCatalogLoading: boolean;
		shipRouteCatalogError: string | null;
		loadShipRouteCatalog: () => void;
		selectedFeature: EmisMapSelectedFeature | null;
		objectRows: EmisObjectSummary[];
		newsRows: EmisNewsSummary[];
		resultsLoaderLoading: boolean;
		resultsError: string | null;
		resultsMeta: { count: number } | null;
		selectVesselFromCatalog: (vessel: ShipRouteVesselOption) => void;
		selectObjectRow: (row: EmisObjectSummary) => void;
		selectNewsRow: (row: EmisNewsSummary) => void;
		clearSelection: () => void;
	} = $props();

	function isSelectedObject(id: string) {
		return selectedFeature?.kind === 'object' && selectedFeature.id === id;
	}

	function isSelectedNews(id: string) {
		return selectedFeature?.kind === 'news' && selectedFeature.id === id;
	}
</script>

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
					onclick={() => loadShipRouteCatalog()}
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
							selectedFeature?.kind === 'vessel' && selectedFeature.id === String(vessel.shipHbkId)}
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
									{[vessel.vesselType, vessel.flag, vessel.callsign].filter(Boolean).join(' · ')}
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
								Status: <span class="font-medium text-foreground">{selectedFeature.status}</span>
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
								HBK: <span class="font-medium text-foreground">{selectedFeature.shipHbkId}</span>
							</div>
							{#if selectedFeature.imo}
								<div>
									IMO: <span class="font-medium text-foreground">{selectedFeature.imo}</span>
								</div>
							{/if}
							{#if selectedFeature.mmsi}
								<div>
									MMSI: <span class="font-medium text-foreground">{selectedFeature.mmsi}</span>
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
			{:else if resultsLoaderLoading && effectiveResultKind === 'objects' && objectRows.length === 0}
				<div class="space-y-3">
					{#each { length: 4 } as _}
						<div class="space-y-2 rounded-xl border border-border/70 p-3">
							<Skeleton class="h-4 w-2/3" />
							<Skeleton class="h-3 w-1/3" />
						</div>
					{/each}
				</div>
			{:else if resultsLoaderLoading && effectiveResultKind === 'news' && newsRows.length === 0}
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
