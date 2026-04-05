<!--
  EmisDrawer — catalog sidebar for EMIS Vessel Positions page.
  Uses flex layout (not fixed) — sits beside the map and pushes it when open.
-->

<script lang="ts">
	import type { EmisMapNewsFeatureProperties } from '@dashboard-builder/emis-contracts/emis-map';
	import type { EmisShipRouteVessel } from '@dashboard-builder/emis-contracts/emis-ship-route';
	import type { FilterWorkspaceRuntime } from '@dashboard-builder/platform-filters';
	import { Skeleton } from '@dashboard-builder/platform-ui';
	import { formatDate, formatNumber } from '@dashboard-builder/platform-core';
	import { FilterPanel } from '@dashboard-builder/platform-filters/widgets';

	type VesselRow = EmisShipRouteVessel & { vesselLabel: string };
	type NewsRow = EmisMapNewsFeatureProperties;
	type CatalogTab = 'vessels' | 'news';

	interface Props {
		open: boolean;
		onToggle: () => void;
		activeCatalogTab: CatalogTab;
		onTabChange: (tab: CatalogTab) => void;
		showVessels: boolean;
		showNews: boolean;
		vessels: VesselRow[];
		filteredVessels: VesselRow[];
		hasActiveVesselFilters: boolean;
		expandedHbkId: number | null;
		onToggleVessel: (vessel: VesselRow) => void;
		catalogLoading: boolean;
		catalogError: string | null;
		newsItems: NewsRow[];
		expandedNewsId: string | null;
		onToggleNews: (news: NewsRow) => void;
		filterRuntime: FilterWorkspaceRuntime;
	}

	let {
		open,
		onToggle,
		activeCatalogTab,
		onTabChange,
		showVessels,
		showNews,
		vessels,
		filteredVessels,
		hasActiveVesselFilters,
		expandedHbkId,
		onToggleVessel,
		catalogLoading,
		catalogError,
		newsItems,
		expandedNewsId,
		onToggleNews,
		filterRuntime
	}: Props = $props();

	function formatCoord(v: number): string {
		return v.toFixed(4);
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

	function handleMiniBarClick(tab: CatalogTab) {
		onTabChange(tab);
		if (!open) onToggle();
	}
</script>

<!-- Mini-bar (always visible, acts as toggle) -->
<div class="flex w-10 shrink-0 flex-col items-center gap-1 border-l border-border bg-card py-3">
	<button
		type="button"
		class={`relative flex h-10 w-10 items-center justify-center transition-colors hover:bg-muted ${activeCatalogTab === 'vessels' ? 'text-primary' : 'text-muted-foreground'}`}
		onclick={() => handleMiniBarClick('vessels')}
		title="Суда"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="h-5 w-5"
		>
			<path d="M2 20l2-3h16l2 3" />
			<path d="M4 17V11a1 1 0 011-1h14a1 1 0 011 1v6" />
			<path d="M12 10V4" />
			<path d="M8 7h8" />
		</svg>
		{#if vessels.length > 0}
			<span
				class="type-caption absolute -top-0.5 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-medium text-primary-foreground"
			>
				{vessels.length > 99 ? '99+' : vessels.length}
			</span>
		{/if}
	</button>

	<button
		type="button"
		class={`relative flex h-10 w-10 items-center justify-center transition-colors hover:bg-muted ${activeCatalogTab === 'news' ? 'text-primary' : 'text-muted-foreground'}`}
		onclick={() => handleMiniBarClick('news')}
		title="Новости"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="h-5 w-5"
		>
			<path d="M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
			<path d="M7 8h10" />
			<path d="M7 12h6" />
			<path d="M7 16h8" />
		</svg>
		{#if newsItems.length > 0}
			<span
				class="type-caption absolute -top-0.5 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-medium text-primary-foreground"
			>
				{newsItems.length > 99 ? '99+' : newsItems.length}
			</span>
		{/if}
	</button>
</div>

<!-- Expanded panel (in-flow, not fixed) -->
{#if open}
	<aside class="flex w-[380px] shrink-0 flex-col border-l border-border bg-card">
		<!-- Tab strip header -->
		<div class="flex items-center gap-1 border-b border-border bg-muted/30 px-3 py-2">
			<div class="flex flex-1 gap-1">
				<button
					type="button"
					class={`type-caption flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
						activeCatalogTab === 'vessels'
							? 'bg-primary text-primary-foreground'
							: 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
					}`}
					onclick={() => onTabChange('vessels')}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="h-3.5 w-3.5"
					>
						<path d="M2 20l2-3h16l2 3" />
						<path d="M4 17V11a1 1 0 011-1h14a1 1 0 011 1v6" />
						<path d="M12 10V4" />
						<path d="M8 7h8" />
					</svg>
					Суда
					{#if vessels.length > 0}
						<span class="opacity-70">{vessels.length}</span>
					{/if}
				</button>
				<button
					type="button"
					class={`type-caption flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
						activeCatalogTab === 'news'
							? 'bg-primary text-primary-foreground'
							: 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
					}`}
					onclick={() => onTabChange('news')}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="h-3.5 w-3.5"
					>
						<path d="M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
						<path d="M7 8h10" />
						<path d="M7 12h6" />
						<path d="M7 16h8" />
					</svg>
					Новости
					{#if newsItems.length > 0}
						<span class="opacity-70">{newsItems.length}</span>
					{/if}
				</button>
			</div>

			<!-- Close button -->
			<button
				type="button"
				class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				onclick={onToggle}
				title="Закрыть"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="h-4 w-4"
				>
					<path d="M18 6L6 18" />
					<path d="M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Filter panel -->
		<div class="border-b border-border px-3 py-2">
			<FilterPanel runtime={filterRuntime} scope="all" direction="horizontal" />
		</div>

		<!-- Counter line -->
		<div class="type-caption border-b border-border/50 px-3 py-1.5 text-muted-foreground">
			{#if activeCatalogTab === 'vessels' && showVessels}
				{hasActiveVesselFilters
					? `${filteredVessels.length} / ${vessels.length}`
					: `${vessels.length}`} судов в viewport
			{:else if activeCatalogTab === 'news' && showNews}
				{newsItems.length} новостей в viewport
			{:else}
				Выберите слой
			{/if}
		</div>

		<!-- Scrollable list area -->
		<div class="flex-1 overflow-y-auto px-3 py-2">
			{#if activeCatalogTab === 'vessels' && showVessels}
				{#if catalogError}
					<div
						class="type-body-sm rounded-xl border border-error/30 bg-error-muted/30 p-3 text-error"
					>
						{catalogError}
					</div>
				{:else if catalogLoading && vessels.length === 0}
					<div class="space-y-2">
						{#each { length: 6 } as _}
							<div class="space-y-2 rounded-lg border border-border/70 p-3">
								<Skeleton class="h-4 w-2/3" />
								<Skeleton class="h-3 w-1/3" />
							</div>
						{/each}
					</div>
				{:else if filteredVessels.length === 0}
					<div class="type-body-sm text-muted-foreground">
						{hasActiveVesselFilters ? 'По фильтрам суда не найдены.' : 'Список судов пуст.'}
					</div>
				{:else}
					<div class="space-y-2">
						{#each filteredVessels as vessel (vessel.shipHbkId)}
							{@const expanded = expandedHbkId === vessel.shipHbkId}
							<div
								class={`rounded-lg border transition-colors ${
									expanded
										? 'border-info/40 bg-info-muted/20'
										: 'border-border/70 hover:bg-muted/20'
								}`}
							>
								<button
									type="button"
									class="w-full p-3 text-left"
									onclick={() => onToggleVessel(vessel)}
								>
									<div class="flex items-start justify-between gap-2">
										<div class="min-w-0">
											<div class="type-body-sm truncate font-medium text-foreground">
												{vessel.vesselName}
											</div>
											<div class="type-caption text-muted-foreground">
												HBK {vessel.shipHbkId}
												{#if vessel.imo}
													<span class="mx-0.5">·</span>IMO {vessel.imo}
												{/if}
												{#if vessel.flag}
													<span class="mx-0.5">·</span>{vessel.flag}
												{/if}
											</div>
										</div>
										<div class="type-caption shrink-0 text-right text-muted-foreground">
											{#if vessel.lastLatitude != null && vessel.lastLongitude != null}
												<div class="font-mono">
													{formatCoord(vessel.lastLatitude)}, {formatCoord(vessel.lastLongitude)}
												</div>
											{:else}
												<div class="text-warning">нет координат</div>
											{/if}
										</div>
									</div>
								</button>

								{#if expanded}
									<div class="space-y-2 border-t border-border/40 px-3 pt-2 pb-3">
										<div
											class="type-caption grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground"
										>
											<div>Код HBK</div>
											<div class="font-medium text-foreground">{vessel.shipHbkId}</div>

											{#if vessel.imo}
												<div>Номер IMO</div>
												<div class="font-medium text-foreground">{vessel.imo}</div>
											{/if}

											{#if vessel.mmsi}
												<div>Номер MMSI</div>
												<div class="font-medium text-foreground">{vessel.mmsi}</div>
											{/if}

											{#if vessel.vesselType}
												<div>Тип судна</div>
												<div class="font-medium text-foreground">{vessel.vesselType}</div>
											{/if}

											{#if vessel.flag}
												<div>Флаг</div>
												<div class="font-medium text-foreground">{vessel.flag}</div>
											{/if}

											{#if vessel.callsign}
												<div>Позывной</div>
												<div class="font-medium text-foreground">{vessel.callsign}</div>
											{/if}

											{#if vessel.lastLatitude != null && vessel.lastLongitude != null}
												<div>Позиция</div>
												<div class="font-mono font-medium text-foreground">
													{formatCoord(vessel.lastLatitude)}, {formatCoord(vessel.lastLongitude)}
												</div>
											{/if}

											<div>Последнее обновление</div>
											<div class="font-medium text-foreground">
												{formatDate(vessel.lastFetchedAt)}
											</div>

											<div>Точек маршрута</div>
											<div class="font-medium text-foreground">
												{formatNumber(vessel.pointsCount)}
											</div>

											<div>Дней маршрута</div>
											<div class="font-medium text-foreground">
												{formatNumber(vessel.routeDaysCount)}
											</div>
										</div>

										<div class="flex items-center gap-3 pt-1">
											<a
												class="type-caption font-medium text-primary underline underline-offset-4"
												href={`/emis?layer=vessels&shipHbkId=${vessel.shipHbkId}`}
											>
												Открыть в workspace
											</a>
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			{:else if activeCatalogTab === 'news' && showNews}
				{#if newsItems.length === 0}
					<div class="type-body-sm text-muted-foreground">
						Нет новостей с геометрией в текущем viewport.
					</div>
				{:else}
					<div class="space-y-2">
						{#each newsItems as news (news.id)}
							{@const expanded = expandedNewsId === news.id}
							{@const badge = importanceBadge(news.importance)}
							<div
								class={`rounded-lg border transition-colors ${
									expanded
										? 'border-warning/40 bg-warning-muted/20'
										: 'border-border/70 hover:bg-muted/20'
								}`}
							>
								<button
									type="button"
									class="w-full p-3 text-left"
									onclick={() => onToggleNews(news)}
								>
									<div class="flex items-start justify-between gap-2">
										<div class="min-w-0">
											<div class="type-body-sm line-clamp-2 font-medium text-foreground">
												{news.title}
											</div>
											<div class="type-caption mt-0.5 text-muted-foreground">
												{news.sourceName}
												{#if news.newsType}
													<span class="mx-0.5">·</span>{news.newsType}
												{/if}
											</div>
										</div>
										<div class="shrink-0">
											<span
												class={`type-caption inline-block rounded-full border px-1.5 py-0.5 font-medium ${badge.tone}`}
											>
												{badge.label}
											</span>
										</div>
									</div>
								</button>

								{#if expanded}
									<div class="space-y-2 border-t border-border/40 px-3 pt-2 pb-3">
										{#if news.summary}
											<p class="type-body-sm leading-relaxed text-foreground/80">
												{news.summary.length > 300
													? news.summary.slice(0, 300) + '\u2026'
													: news.summary}
											</p>
										{/if}
										<div
											class="type-caption grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground"
										>
											<div>Источник</div>
											<div class="font-medium text-foreground">{news.sourceName}</div>

											{#if news.newsType}
												<div>Тип события</div>
												<div class="font-medium text-foreground">{news.newsType}</div>
											{/if}

											{#if news.countryCode}
												<div>Страна</div>
												<div class="font-medium text-foreground">{news.countryCode}</div>
											{/if}

											{#if news.region}
												<div>Регион</div>
												<div class="font-medium text-foreground">{news.region}</div>
											{/if}

											<div>Опубликовано</div>
											<div class="font-medium text-foreground">{formatDate(news.publishedAt)}</div>

											<div>Важность</div>
											<div class="font-medium text-foreground">
												<span
													class={`inline-block rounded-full border px-1.5 py-0.5 font-medium ${importanceBadge(news.importance).tone}`}
												>
													{importanceBadge(news.importance).label}
												</span>
											</div>

											{#if news.relatedObjectsCount > 0}
												<div>Связанные объекты</div>
												<div class="font-medium text-foreground">{news.relatedObjectsCount}</div>
											{/if}
										</div>

										<div class="flex flex-wrap items-center gap-3 pt-1">
											<a
												class="type-caption font-medium text-primary underline underline-offset-4"
												href={`/emis/news/${news.id}`}
											>
												Подробнее
											</a>
											{#if news.url}
												<a
													class="type-caption font-medium text-primary underline underline-offset-4"
													href={news.url}
													target="_blank"
													rel="noopener noreferrer"
												>
													Читать оригинал
												</a>
											{/if}
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			{:else}
				<div class="type-body-sm text-muted-foreground">Выберите слой для отображения данных.</div>
			{/if}
		</div>
	</aside>
{/if}
