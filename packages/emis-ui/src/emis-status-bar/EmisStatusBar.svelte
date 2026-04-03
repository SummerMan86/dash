<script lang="ts">
	import { formatCompact, formatDate, formatNumber } from '@dashboard-builder/platform-core';

	interface Props {
		vesselCount: number;
		vesselsWithCoords: number;
		newsCount: number | null;
		totalPoints: number;
		latestFetch: string | null;
		catalogLoading: boolean;
		showVessels: boolean;
		showNews: boolean;
		onToggleVessels: () => void;
		onToggleNews: () => void;
	}

	let {
		vesselCount,
		vesselsWithCoords,
		newsCount,
		totalPoints,
		latestFetch,
		catalogLoading,
		showVessels,
		showNews,
		onToggleVessels,
		onToggleNews
	}: Props = $props();

	const isLoading = $derived(catalogLoading && vesselCount === 0);

	const vesselText = $derived(isLoading ? '...' : formatNumber(vesselCount));
	const coordsText = $derived(isLoading ? '...' : formatNumber(vesselsWithCoords));
	const newsText = $derived(newsCount == null ? '...' : formatCompact(newsCount, 0));
	const pointsText = $derived(isLoading ? '...' : formatCompact(totalPoints, 1));
	const fetchText = $derived(
		latestFetch
			? formatDate(latestFetch, {
					hour: '2-digit',
					minute: '2-digit',
					day: undefined,
					month: undefined,
					year: undefined
				})
			: null
	);
</script>

<div class="status-bar">
	<!-- Vessels toggle -->
	<button
		type="button"
		class="status-item"
		class:active={showVessels}
		class:inactive={!showVessels}
		onclick={onToggleVessels}
		title={showVessels ? 'Скрыть суда' : 'Показать суда'}
	>
		<svg
			aria-hidden="true"
			class="status-icon"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			stroke-width="1.3"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M2 11l1.5-5h9L14 11" />
			<path d="M1 11c1 2 3.5 3 7 3s6-1 7-3" />
			<path d="M8 6V2" />
			<path d="M6 4h4" />
		</svg>
		<span class="status-value">{vesselText}</span>
		<span class="status-label">судов</span>
		<span class="status-detail">({coordsText} с коорд.)</span>
	</button>

	<div class="status-divider"></div>

	<!-- News toggle -->
	<button
		type="button"
		class="status-item"
		class:active={showNews}
		class:inactive={!showNews}
		onclick={onToggleNews}
		title={showNews ? 'Скрыть новости' : 'Показать новости'}
	>
		<svg
			aria-hidden="true"
			class="status-icon"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			stroke-width="1.3"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<rect x="2" y="2" width="12" height="12" rx="1.5" />
			<path d="M5 5h6" />
			<path d="M5 8h6" />
			<path d="M5 11h3" />
		</svg>
		<span class="status-value">{newsText}</span>
		<span class="status-label">новостей</span>
	</button>

	<div class="status-divider"></div>

	<!-- Route points (static) -->
	<div class="status-item static">
		<svg
			aria-hidden="true"
			class="status-icon"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			stroke-width="1.3"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path
				d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5z"
			/>
			<circle cx="8" cy="6" r="1.5" />
		</svg>
		<span class="status-value">{pointsText}</span>
		<span class="status-label">точек</span>
	</div>

	<!-- Last fetch (conditional) -->
	{#if fetchText}
		<div class="status-divider"></div>
		<div class="status-item static">
			<svg
				aria-hidden="true"
				class="status-icon"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				stroke-width="1.3"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="8" cy="8" r="6" />
				<path d="M8 4.5V8l2.5 1.5" />
			</svg>
			<span class="status-value">{fetchText}</span>
		</div>
	{/if}
</div>

<style>
	.status-bar {
		display: flex;
		align-items: center;
		gap: 1rem;
		height: 2.5rem;
		padding: 0 1rem;
		border-bottom: 1px solid var(--color-border, hsl(0 0% 90%));
		background: var(--color-muted, hsl(0 0% 96%));
		flex-shrink: 0;
		overflow: hidden;
	}

	.status-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.5rem;
		border-radius: 0.375rem;
		border: none;
		background: none;
		font: inherit;
		cursor: default;
		white-space: nowrap;
		line-height: 1;
	}

	button.status-item {
		cursor: pointer;
		transition: background-color 150ms;
	}

	button.status-item:hover {
		background-color: var(--color-muted, hsl(0 0% 90%));
	}

	.status-item.active {
		color: var(--color-foreground, hsl(0 0% 10%));
	}

	.status-item.inactive {
		color: var(--color-muted-foreground, hsl(0 0% 55%));
		opacity: 0.4;
	}

	.status-item.static {
		color: var(--color-foreground, hsl(0 0% 10%));
	}

	.status-icon {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.status-value {
		font-size: 0.8125rem;
		font-weight: 600;
	}

	.status-label {
		font-size: 0.75rem;
		color: var(--color-muted-foreground, hsl(0 0% 55%));
	}

	.status-detail {
		font-size: 0.75rem;
		color: var(--color-muted-foreground, hsl(0 0% 55%));
	}

	.status-divider {
		width: 1px;
		height: 1rem;
		flex-shrink: 0;
		background-color: var(--color-border, hsl(0 0% 90%));
	}

	/* Responsive: hide labels and details on narrow screens */
	@media (max-width: 639px) {
		.status-label,
		.status-detail {
			display: none;
		}
	}

	/* Coordinates detail only on wider screens */
	@media (max-width: 767px) {
		.status-detail {
			display: none;
		}
	}
</style>
