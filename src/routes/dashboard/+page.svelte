<script lang="ts">
	import { Button } from '$shared/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$shared/ui/card';

	import {
		useDashboardEditor,
		WidgetCanvas,
		WidgetEditorShell,
		WidgetInspector,
		WidgetToolbox
	} from '$lib/features/dashboard-edit';
	import type { DashboardConfig } from '$lib/features/dashboard-edit';

	let { data }: { data: { dashboard: DashboardConfig } } = $props();

	/**
	 * The useDashboardEditor composable handles:
	 * - Widget state management
	 * - Selection and draft state
	 * - Persistence to localStorage
	 * - All GridStack integration callbacks
	 */
	const editor = useDashboardEditor({
		initial: data.dashboard,
		storageKey: 'dashboard-editor:v1',
		columns: 12,
		rowHeightPx: 24
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
				variant={editor.editable ? 'default' : 'secondary'}
				onclick={() => editor.setEditable(!editor.editable)}
			>
				{editor.editable ? 'Edit mode' : 'View mode'}
			</Button>
			<Button variant="secondary" onclick={() => editor.reset()}>Reset</Button>
		</div>
	</header>

	<WidgetEditorShell>
		<!-- Left: Toolbox -->
		<WidgetToolbox
			selectedType={editor.draft?.type}
			editable={editor.editable}
			onSelectType={(t) => editor.setDraftType(t)}
		/>

		<!-- Center: Dashboard -->
		<Card>
			<CardHeader>
				<CardTitle>Dashboard</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<WidgetCanvas
					widgets={editor.widgets}
					editable={editor.editable}
					columns={editor.columns}
					rowHeightPx={editor.rowHeightPx}
					selectedId={editor.selectedId}
					onSelect={(id) => editor.selectWidget(id)}
					onWidgetsChange={editor.handleWidgetsChange}
					onFinalize={editor.handleFinalize}
				/>
			</CardContent>
		</Card>

		<!-- Right: Inspector -->
		<div class="space-y-6">
			<WidgetInspector
				editable={editor.editable}
				selectedWidget={editor.selectedWidget}
				draft={editor.draft}
				onChangeSelected={(patch) => {
					if (editor.selectedId) {
						editor.patchWidget(editor.selectedId, patch);
					}
				}}
				onChangeDraft={(patch) => editor.patchDraft(patch)}
				onAddWidget={() => editor.addWidgetFromDraft()}
			/>

			<Card>
				<CardHeader>
					<CardTitle>State</CardTitle>
				</CardHeader>
				<CardContent class="space-y-2 text-sm">
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Mode</span>
						<span class="font-medium">{editor.editable ? 'edit' : 'view'}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Selected</span>
						<span class="font-medium">{editor.selectedWidget?.id ?? (editor.draft ? 'new' : '—')}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Widgets</span>
						<span class="font-medium">{editor.widgets.length}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-muted-foreground">Save</span>
						<span class="font-medium">{editor.saveState}</span>
					</div>
					{#if editor.lastError}
						<div class="rounded-md border border-border/50 bg-muted/20 p-2 text-xs text-error">
							{editor.lastError}
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
