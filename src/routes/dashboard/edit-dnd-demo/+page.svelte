<script lang="ts">
	import { onMount } from 'svelte';

	import { Button } from '$shared/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$shared/ui/card';

	import {
		WidgetCanvas,
		WidgetEditorShell,
		WidgetInspector,
		WidgetToolbox
	} from '$lib/features/dashboard-edit';
	import { applyGridByIndex } from '$lib/features/dashboard-edit/model/layout';
	import {
		clearDashboardStorage,
		createDebouncedDashboardSaver,
		loadDashboardFromStorage,
		type SaveState
	} from '$lib/features/dashboard-edit/model/save';
	import type {
		DashboardConfig,
		DashboardWidget,
		WidgetType
	} from '$lib/features/dashboard-edit/model/types';

	const STORAGE_KEY = 'dashboard-edit-dnd-demo:v1';

	let { data }: { data: { dashboard: DashboardConfig } } = $props();

	let editable = $state(true);
	let widgets = $state<DashboardWidget[]>(data.dashboard.widgets);
	let saveState = $state<SaveState>('idle');
	let lastError = $state<string | null>(null);
	let selectedId = $state<string | null>(null);
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
		endpoint: '/dashboard/edit-dnd-demo/save',
		delayMs: 500,
		onStateChange: (state, err) => {
			saveState = state;
			lastError = err ? String(err) : null;
		}
	});

	function currentDashboard(): DashboardConfig {
		return {
			...data.dashboard,
			widgets
		};
	}

	function handleFinalize(nextWidgets: DashboardWidget[]) {
		widgets = nextWidgets;
		saver.save(currentDashboard());
	}

	function saveNow() {
		saver.save(currentDashboard());
	}

	function selectWidget(id: string) {
		selectedId = id;
	}

	const selectedWidget = $derived(widgets.find((w) => w.id === selectedId) ?? null);

	function setDraftType(type: WidgetType) {
		selectedId = null;
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
			layout: { x: 0, y: 0, w: 1, h: 1 },
			config: { measure: draft.measure, dimension: draft.dimension }
		};

		selectedId = id;
		draft = undefined;
		widgets = applyGridByIndex([...widgets, next], 4);
		saveNow();
	}

	function patchSelected(patch: Partial<DashboardWidget>) {
		if (!selectedId) return;
		widgets = widgets.map((w) => (w.id === selectedId ? { ...w, ...patch } : w));
		saveNow();
	}

	function patchDraft(patch: Partial<NonNullable<typeof draft>>) {
		if (!draft) return;
		draft = { ...draft, ...patch };
	}

	function resetToFixture() {
		clearDashboardStorage(STORAGE_KEY);
		widgets = applyGridByIndex(data.dashboard.widgets);
		saveState = 'idle';
		lastError = null;
		selectedId = null;
		draft = undefined;
	}

	onMount(() => {
		const stored = loadDashboardFromStorage(STORAGE_KEY);
		if (stored?.widgets?.length) {
			widgets = stored.widgets;
		}
	});
</script>

<svelte:head>
	<title>Dashboard Edit DnD Demo</title>
</svelte:head>

<div class="min-h-screen bg-background p-6 lg:p-8">
	<header class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Dashboard Edit — DnD Demo</h1>
			<p class="text-sm text-muted-foreground">
				One canvas zone, drag handle, grid-by-index layout, debounced save with abort.
			</p>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<Button variant={editable ? 'default' : 'secondary'} onclick={() => (editable = !editable)}>
				{editable ? 'Edit mode' : 'View mode'}
			</Button>
			<Button variant="secondary" onclick={resetToFixture}>Reset</Button>
		</div>
	</header>

	<WidgetEditorShell>
		<!-- Left: Toolbox -->
		<WidgetToolbox selectedType={draft?.type} {editable} onSelectType={(t) => setDraftType(t)} />

		<!-- Center: Dashboard -->
		<Card>
			<CardHeader>
				<CardTitle>Dashboard</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<WidgetCanvas
					bind:widgets
					{editable}
					columns={4}
					{selectedId}
					onSelect={selectWidget}
					onFinalize={handleFinalize}
				/>
			</CardContent>
		</Card>

		<!-- Right: Inspector -->
		<div class="space-y-6">
			<WidgetInspector
				{editable}
				{selectedWidget}
				{draft}
				onChangeSelected={patchSelected}
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
						<span class="font-medium">{editable ? 'edit' : 'view'}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Selected</span>
						<span class="font-medium">{selectedWidget?.id ?? (draft ? 'new' : '—')}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Widgets</span>
						<span class="font-medium">{widgets.length}</span>
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
						Tip: drag fast a few times — only the last save should complete in Network.
					</p>
				</CardContent>
			</Card>
		</div>
	</WidgetEditorShell>
</div>
