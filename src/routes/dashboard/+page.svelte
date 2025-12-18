<script lang="ts">
	import { get } from 'svelte/store';
	import { onMount } from 'svelte';

	import { Button } from '$shared/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$shared/ui/card';

	import {
		WidgetCanvas,
		WidgetEditorShell,
		WidgetInspector,
		WidgetToolbox
	} from '$lib/features/dashboard-edit';
	import { createDashboardEditorStore } from '$lib/features/dashboard-edit/model/store';
	import {
		clearDashboardStorage,
		createDebouncedDashboardSaver,
		loadDashboardFromStorage,
		type SaveState
	} from '$lib/features/dashboard-edit/model/save';
	import type { DashboardConfig, DashboardWidget, WidgetType } from '$lib/features/dashboard-edit/model/types';

	const STORAGE_KEY = 'dashboard-editor:v1';
	const COLUMNS = 12;
	const ROW_HEIGHT_PX = 56;

	let { data }: { data: { dashboard: DashboardConfig } } = $props();

	const editor = createDashboardEditorStore(data.dashboard);
	const { editable, widgets, selectedId, selectedWidget, dashboard, setWidgets, selectWidget, patchSelected, addWidget } =
		editor;

	let saveState = $state<SaveState>('idle');
	let lastError = $state<string | null>(null);

	let draft = $state<
		| {
				type: WidgetType;
				title: string;
				measure: string;
				dimension: string;
		  }
		| undefined
	>(undefined);

	const saver = createDebouncedDashboardSaver({
		storageKey: STORAGE_KEY,
		delayMs: 500,
		onStateChange: (state, err) => {
			saveState = state;
			lastError = err ? String(err) : null;
		}
	});

	function saveNow() {
		saver.save(get(dashboard));
	}

	function handleWidgetsChange(next: DashboardWidget[]) {
		setWidgets(next);
	}

	function handleFinalize(next: DashboardWidget[]) {
		setWidgets(next);
		saveNow();
	}

	function setDraftType(type: WidgetType) {
		selectWidget(null);
		draft = {
			type,
			title: `New ${type.toUpperCase()}`,
			measure: 'revenue',
			dimension: 'date'
		};
	}

	function addWidgetFromDraft() {
		if (!draft) return;

		const id =
			typeof crypto !== 'undefined' && 'randomUUID' in crypto
				? crypto.randomUUID()
				: `w-${Date.now()}-${Math.random().toString(16).slice(2)}`;

		const next: DashboardWidget = {
			id,
			type: draft.type,
			title: draft.title,
			layout: { x: 0, y: 0, w: 3, h: 3 },
			config: { measure: draft.measure, dimension: draft.dimension }
		};

		draft = undefined;
		addWidget(next, COLUMNS);
		saveNow();
	}

	function patchSelectedWidget(patch: Partial<DashboardWidget>) {
		patchSelected(patch);
		saveNow();
	}

	function patchDraft(patch: Partial<NonNullable<typeof draft>>) {
		if (!draft) return;
		draft = { ...draft, ...patch };
	}

	function resetToFixture() {
		clearDashboardStorage(STORAGE_KEY);
		setWidgets(data.dashboard.widgets);
		saveState = 'idle';
		lastError = null;
		selectWidget(null);
		draft = undefined;
	}

	onMount(() => {
		const stored = loadDashboardFromStorage(STORAGE_KEY);
		if (stored?.widgets?.length) {
			setWidgets(stored.widgets);
		}
	});
</script>

<svelte:head>
	<title>Dashboard Editor</title>
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<header class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Dashboard Editor</h1>
			<p class="text-sm text-muted-foreground">
				GridStack layout (drag + resize) with Svelte stores and Inspector.
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<Button
				variant={$editable ? 'default' : 'secondary'}
				onclick={() => {
					editable.set(!$editable);
				}}
			>
				{$editable ? 'Edit mode' : 'View mode'}
			</Button>
			<Button variant="secondary" onclick={resetToFixture}>Reset</Button>
		</div>
	</header>

	<WidgetEditorShell>
		<!-- Left: Toolbox -->
		<WidgetToolbox selectedType={draft?.type} editable={$editable} onSelectType={(t) => setDraftType(t)} />

		<!-- Center: Dashboard -->
		<Card>
			<CardHeader>
				<CardTitle>Dashboard</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<WidgetCanvas
					widgets={$widgets}
					editable={$editable}
					columns={COLUMNS}
					rowHeightPx={ROW_HEIGHT_PX}
					selectedId={$selectedId}
					onSelect={(id) => selectWidget(id)}
					onWidgetsChange={handleWidgetsChange}
					onFinalize={handleFinalize}
				/>
			</CardContent>
		</Card>

		<!-- Right: Inspector -->
		<div class="space-y-6">
			<WidgetInspector
				editable={$editable}
				selectedWidget={$selectedWidget}
				draft={draft}
				onChangeSelected={patchSelectedWidget}
				onChangeDraft={patchDraft}
				onAddWidget={addWidgetFromDraft}
			/>

			<Card>
				<CardHeader>
					<CardTitle>State</CardTitle>
				</CardHeader>
				<CardContent class="space-y-2 text-sm">
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Mode</span>
						<span class="font-medium">{$editable ? 'edit' : 'view'}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Selected</span>
						<span class="font-medium">{$selectedWidget?.id ?? (draft ? 'new' : '—')}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Widgets</span>
						<span class="font-medium">{$widgets.length}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Save</span>
						<span class="font-medium">{saveState}</span>
					</div>
					{#if lastError}
						<div class="rounded-md border border-border/50 bg-muted/20 p-2 text-xs text-error">
							{lastError}
						</div>
					{/if}
					<p class="pt-2 text-xs text-muted-foreground">
						Drag by the handle ≡ and resize by widget edges.
					</p>
				</CardContent>
			</Card>
		</div>
	</WidgetEditorShell>
</div>
