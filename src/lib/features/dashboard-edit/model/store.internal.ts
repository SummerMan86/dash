import { derived, get, writable, type Readable, type Writable } from 'svelte/store';

import { placeWidgetInFirstFreeSlot } from './layout.internal';
import type { DashboardConfig, DashboardWidget } from './types';

/**
 * DashboardEditorStore is a small, explicit API over Svelte stores.
 *
 * Why this exists:
 * - Keeps UI components simple: they call `selectWidget()`, `patchSelected()`, etc.
 * - Encapsulates immutable updates (important for Svelte reactivity).
 * - Central place to add more behavior later (validation, undo/redo) without rewriting UI.
 */
export type DashboardEditorStore = {
	editable: Writable<boolean>;
	widgets: Writable<DashboardWidget[]>;
	selectedId: Writable<string | null>;
	selectedWidget: Readable<DashboardWidget | null>;
	dashboard: Readable<DashboardConfig>;

	setWidgets: (next: DashboardWidget[]) => void;
	selectWidget: (id: string | null) => void;
	patchWidget: (id: string, patch: Partial<DashboardWidget>) => void;
	patchSelected: (patch: Partial<DashboardWidget>) => void;
	addWidget: (widget: DashboardWidget, columns: number) => void;
};

export function createDashboardEditorStore(initial: DashboardConfig): DashboardEditorStore {
	// Writable stores: simple mutable state (edit mode, widgets list, selection).
	const editable = writable(true);
	const widgets = writable<DashboardWidget[]>(initial.widgets);
	const selectedId = writable<string | null>(null);

	// Derived stores: computed state that stays in sync automatically.
	const selectedWidget = derived([widgets, selectedId], ([$widgets, $selectedId]) => {
		if (!$selectedId) return null;
		return $widgets.find((w) => w.id === $selectedId) ?? null;
	});

	// This exposes a full DashboardConfig, but only widgets are mutable right now.
	const dashboard = derived(widgets, ($widgets) => ({ ...initial, widgets: $widgets }));

	// Replace the widget list wholesale (used by GridStack callbacks and reset/load).
	function setWidgets(next: DashboardWidget[]) {
		widgets.set(next);
	}

	// Select a widget in the UI (Inspector uses this).
	function selectWidget(id: string | null) {
		selectedId.set(id);
	}

	// Patch a widget by id with an immutable update.
	// Important: do not mutate `DashboardWidget` objects in-place, or Svelte may not update correctly.
	function patchWidget(id: string, patch: Partial<DashboardWidget>) {
		widgets.update((list) => list.map((w) => (w.id === id ? { ...w, ...patch } : w)));
	}

	// Convenience helper: patch whichever widget is currently selected.
	function patchSelected(patch: Partial<DashboardWidget>) {
		const id = get(selectedId);
		if (!id) return;
		patchWidget(id, patch);
	}

	// Add a new widget and place it into the first free slot in the grid.
	// This keeps insert logic deterministic and avoids overlaps.
	function addWidget(widget: DashboardWidget, columns: number) {
		widgets.update((list) => placeWidgetInFirstFreeSlot(list, widget, columns));
		selectedId.set(widget.id);
	}

	return {
		editable,
		widgets,
		selectedId,
		selectedWidget,
		dashboard,
		setWidgets,
		selectWidget,
		patchWidget,
		patchSelected,
		addWidget
	};
}
