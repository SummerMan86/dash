import { derived, get, writable, type Readable, type Writable } from 'svelte/store';

import { placeWidgetInFirstFreeSlot } from './layout';
import type { DashboardConfig, DashboardWidget } from './types';

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
	const editable = writable(true);
	const widgets = writable<DashboardWidget[]>(initial.widgets);
	const selectedId = writable<string | null>(null);

	const selectedWidget = derived([widgets, selectedId], ([$widgets, $selectedId]) => {
		if (!$selectedId) return null;
		return $widgets.find((w) => w.id === $selectedId) ?? null;
	});

	const dashboard = derived(widgets, ($widgets) => ({ ...initial, widgets: $widgets }));

	function setWidgets(next: DashboardWidget[]) {
		widgets.set(next);
	}

	function selectWidget(id: string | null) {
		selectedId.set(id);
	}

	function patchWidget(id: string, patch: Partial<DashboardWidget>) {
		widgets.update((list) => list.map((w) => (w.id === id ? { ...w, ...patch } : w)));
	}

	function patchSelected(patch: Partial<DashboardWidget>) {
		const id = get(selectedId);
		if (!id) return;
		patchWidget(id, patch);
	}

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
