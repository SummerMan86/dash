<script lang="ts">
	import { cn } from '$shared/styles/utils';
	import { Button } from '$shared/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$shared/ui/card';
	import { Input } from '$shared/ui/input';
	import { Select } from '$shared/ui/select';

	import type { DashboardWidget, WidgetType } from '../model/types';

	interface DraftWidget {
		type: WidgetType;
		title: string;
		measure: string;
		dimension: string;
	}

	interface Props {
		editable?: boolean;
		selectedWidget?: DashboardWidget | null;
		draft?: DraftWidget;
		measures?: string[];
		dimensions?: string[];
		onChangeSelected?: (patch: Partial<DashboardWidget>) => void;
		onChangeDraft?: (patch: Partial<DraftWidget>) => void;
		onAddWidget?: () => void;
		class?: string;
	}

	let {
		editable = true,
		selectedWidget = null,
		draft,
		measures = ['revenue', 'transactions', 'rejection_rate', 'active_clients'],
		dimensions = ['date', 'client', 'mcc', 'region'],
		onChangeSelected,
		onChangeDraft,
		onAddWidget,
		class: className
	}: Props = $props();

	const mode = $derived(selectedWidget ? 'selected' : 'draft');

	function setSelectedTitle(title: string) {
		if (!selectedWidget) return;
		onChangeSelected?.({ title });
	}

	function setSelectedConfigMeasure(measure: string) {
		if (!selectedWidget) return;
		onChangeSelected?.({ config: { ...(selectedWidget.config ?? {}), measure } });
	}

	function setSelectedConfigDimension(dimension: string) {
		if (!selectedWidget) return;
		onChangeSelected?.({ config: { ...(selectedWidget.config ?? {}), dimension } });
	}
</script>

<Card class={cn('h-fit', className)}>
	<CardHeader>
		<CardTitle>Inspector</CardTitle>
	</CardHeader>
	<CardContent class="space-y-4">
		{#if mode === 'selected' && selectedWidget}
			<div class="space-y-1">
				<div class="text-xs text-muted-foreground">Selected widget</div>
				<div class="text-sm font-medium">{selectedWidget.type}</div>
			</div>

			<div class="space-y-2">
				<label class="text-xs text-muted-foreground" for="selected-title">Title</label>
				<Input
					id="selected-title"
					value={selectedWidget.title}
					disabled={!editable}
					oninput={(e) => setSelectedTitle((e.currentTarget as HTMLInputElement).value)}
				/>
			</div>

			<div class="space-y-2">
				<label class="text-xs text-muted-foreground" for="selected-measure">Measure</label>
				<Select
					id="selected-measure"
					disabled={!editable}
					value={selectedWidget.config?.measure ?? measures[0]}
					onchange={(e) => setSelectedConfigMeasure((e.currentTarget as HTMLSelectElement).value)}
				>
					{#each measures as m}
						<option value={m}>{m}</option>
					{/each}
				</Select>
			</div>

			<div class="space-y-2">
				<label class="text-xs text-muted-foreground" for="selected-dimension">Dimension</label>
				<Select
					id="selected-dimension"
					disabled={!editable}
					value={selectedWidget.config?.dimension ?? dimensions[0]}
					onchange={(e) => setSelectedConfigDimension((e.currentTarget as HTMLSelectElement).value)}
				>
					{#each dimensions as d}
						<option value={d}>{d}</option>
					{/each}
				</Select>
			</div>

			<p class="text-xs text-muted-foreground">
				Drag/resize changes layout; inspector edits update config.
			</p>
		{:else}
			<div class="space-y-1">
				<div class="text-xs text-muted-foreground">New widget</div>
				<div class="text-sm font-medium">{draft?.type ?? 'Select a type'}</div>
			</div>

			<div class="space-y-2">
				<label class="text-xs text-muted-foreground" for="draft-title">Title</label>
				<Input
					id="draft-title"
					value={draft?.title ?? ''}
					disabled={!editable || !draft}
					oninput={(e) => onChangeDraft?.({ title: (e.currentTarget as HTMLInputElement).value })}
				/>
			</div>

			<div class="space-y-2">
				<label class="text-xs text-muted-foreground" for="draft-measure">Measure</label>
				<Select
					id="draft-measure"
					disabled={!editable || !draft}
					value={draft?.measure ?? measures[0]}
					onchange={(e) =>
						onChangeDraft?.({ measure: (e.currentTarget as HTMLSelectElement).value })}
				>
					{#each measures as m}
						<option value={m}>{m}</option>
					{/each}
				</Select>
			</div>

			<div class="space-y-2">
				<label class="text-xs text-muted-foreground" for="draft-dimension">Dimension</label>
				<Select
					id="draft-dimension"
					disabled={!editable || !draft}
					value={draft?.dimension ?? dimensions[0]}
					onchange={(e) =>
						onChangeDraft?.({ dimension: (e.currentTarget as HTMLSelectElement).value })}
				>
					{#each dimensions as d}
						<option value={d}>{d}</option>
					{/each}
				</Select>
			</div>

			<Button class="w-full" disabled={!editable || !draft} onclick={() => onAddWidget?.()}>
				Add to dashboard
			</Button>

			<p class="text-xs text-muted-foreground">
				MVP: measure/dimension are placeholders (constants).
			</p>
		{/if}
	</CardContent>
</Card>
