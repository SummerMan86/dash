<!--
  ScenarioParams Component
  Collapsible panel for scenario parameters selection

  Usage:
    <ScenarioParams
      selectedPreset="balanced"
      onPresetChange={(name) => selectedPreset = name}
    />
-->

<script lang="ts">
	import { cn } from '$shared/styles/utils';
	import { Button } from '$shared/ui/button';
	import { Card, CardContent } from '$shared/ui/card';
	import type { PresetName } from '../../../routes/dashboard/wildberries/stock-alerts/filters';
	import {
		SCENARIO_PRESETS,
		PRESET_LIST,
		getPresetParams
	} from '../../../routes/dashboard/wildberries/stock-alerts/filters';

	interface Props {
		/** Currently selected preset */
		selectedPreset: PresetName;
		/** Callback when preset changes */
		onPresetChange?: (preset: PresetName) => void;
		/** Additional classes */
		class?: string;
	}

	let { selectedPreset, onPresetChange, class: className }: Props = $props();

	// Collapsible state
	let isOpen = $state(false);

	// Current preset info
	let currentPreset = $derived(SCENARIO_PRESETS[selectedPreset]);
	let params = $derived(currentPreset.params);
	let threshold = $derived(params.L + params.S);

	// Parameter definitions with labels and tooltips
	const paramDefs = {
		L: {
			label: 'Срок поставки',
			code: 'L',
			tooltip:
				'Сколько дней проходит от решения о пополнении до момента, когда товар доступен к продаже на складе WB'
		},
		S: {
			label: 'Страховой запас',
			code: 'S',
			tooltip: 'Дополнительные дни запаса на случай скачков спроса или задержек поставки'
		},
		R: {
			label: 'Интервал поставок',
			code: 'R',
			tooltip: 'Как часто вы отправляете поставки на склад WB (например, раз в 7 дней)'
		},
		W: {
			label: 'Окно анализа',
			code: 'W',
			tooltip:
				'За сколько последних дней считать средние продажи (короткое окно — чувствительнее к трендам, длинное — стабильнее)'
		},
		threshold: {
			label: 'Мин. запас',
			code: 'L+S',
			tooltip:
				'Минимум дней запаса, который должен оставаться на складе. Равен сумме показателей Срок поставки и Страховой запас'
		}
	} as const;

	function handlePresetClick(name: PresetName) {
		onPresetChange?.(name);
	}

	function toggle() {
		isOpen = !isOpen;
	}
</script>

<Card class={cn('overflow-hidden', className)}>
	<!-- Collapsible Header -->
	<button
		type="button"
		class="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
		onclick={toggle}
		aria-expanded={isOpen}
	>
		<div class="flex items-center gap-2">
			<svg
				class={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-90')}
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
			<span class="type-control">Параметры сценария:</span>
			<span class="type-body-sm text-muted-foreground">{currentPreset.label}</span>
		</div>
		<div class="type-caption text-muted-foreground" title={paramDefs.threshold.tooltip}>
			{paramDefs.threshold.label}: {threshold} дн.
		</div>
	</button>

	<!-- Collapsible Content -->
	{#if isOpen}
		<CardContent class="space-y-4 border-t border-border/50 pt-4">
			<!-- Preset Buttons -->
			<div class="flex flex-wrap gap-2">
				{#each PRESET_LIST as preset (preset.name)}
					<Button
						variant={selectedPreset === preset.name ? 'default' : 'outline'}
						size="sm"
						onclick={() => handlePresetClick(preset.name)}
						title={preset.description}
					>
						{preset.label}
					</Button>
				{/each}
			</div>

			<!-- Parameters Display -->
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
				<!-- L: Срок поставки -->
				<div
					class="cursor-help rounded-md border border-border/50 p-3 text-center"
					title={paramDefs.L.tooltip}
				>
					<div class="type-kpi-value">{params.L}</div>
					<div class="type-caption-strong">{paramDefs.L.label}</div>
					<div class="type-caption text-muted-foreground">({paramDefs.L.code})</div>
				</div>

				<!-- S: Страховой запас -->
				<div
					class="cursor-help rounded-md border border-border/50 p-3 text-center"
					title={paramDefs.S.tooltip}
				>
					<div class="type-kpi-value">{params.S}</div>
					<div class="type-caption-strong">{paramDefs.S.label}</div>
					<div class="type-caption text-muted-foreground">({paramDefs.S.code})</div>
				</div>

				<!-- R: Интервал поставок -->
				<div
					class="cursor-help rounded-md border border-border/50 p-3 text-center"
					title={paramDefs.R.tooltip}
				>
					<div class="type-kpi-value">{params.R}</div>
					<div class="type-caption-strong">{paramDefs.R.label}</div>
					<div class="type-caption text-muted-foreground">({paramDefs.R.code})</div>
				</div>

				<!-- W: Окно анализа -->
				<div
					class="cursor-help rounded-md border border-border/50 p-3 text-center"
					title={paramDefs.W.tooltip}
				>
					<div class="type-kpi-value">{params.W}</div>
					<div class="type-caption-strong">{paramDefs.W.label}</div>
					<div class="type-caption text-muted-foreground">({paramDefs.W.code})</div>
				</div>

				<!-- Threshold: Мин. запас -->
				<div
					class="col-span-2 cursor-help rounded-md border border-warning/30 bg-warning-muted p-3 text-center sm:col-span-1"
					title={paramDefs.threshold.tooltip}
				>
					<div class="type-kpi-value text-warning">{threshold}</div>
					<div class="type-caption-strong">{paramDefs.threshold.label}</div>
					<div class="type-caption text-muted-foreground">({paramDefs.threshold.code})</div>
				</div>
			</div>

			<!-- Description -->
			<p class="type-caption text-muted-foreground">
				{currentPreset.description}
			</p>
		</CardContent>
	{/if}
</Card>
