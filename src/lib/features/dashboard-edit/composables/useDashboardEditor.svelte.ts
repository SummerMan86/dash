import { browser } from '$app/environment';
import { onMount } from 'svelte';

import { DEFAULT_GRID_CONFIG, type GridConfig } from '../model/config';
import { placeWidgetInFirstFreeSlot } from '../model/layout.internal';
import {
	clearDashboardStorage,
	createDebouncedDashboardSaver,
	loadDashboardFromStorage,
	type SaveState
} from '../model/save.internal';
import type { DashboardConfig, DashboardWidget, WidgetConfig, WidgetType } from '../model/types';

/**
 * Options for creating a dashboard editor.
 */
export type DashboardEditorOptions = {
	/** Initial dashboard config (from server or default) */
	initial: DashboardConfig;
	/** Storage key for localStorage persistence (null = no persistence) */
	storageKey?: string | null;
	/** Number of grid columns */
	columns?: number;
	/** Row height in pixels */
	rowHeightPx?: number;
	/** Auto-save delay in milliseconds */
	autoSaveDelayMs?: number;
	/** Optional server endpoint for persistence */
	endpoint?: string;
};

/**
 * Draft widget state (for widget being created via toolbox).
 */
export type WidgetDraft = {
	type: WidgetType;
	title: string;
	measure: string;
	dimension: string;
};

/**
 * Dashboard editor API returned by useDashboardEditor.
 */
export type DashboardEditorApi = {
	// === Reactive state (getters) ===
	readonly widgets: DashboardWidget[];
	readonly selectedWidget: DashboardWidget | null;
	readonly selectedId: string | null;
	readonly editable: boolean;
	readonly saveState: SaveState;
	readonly lastError: string | null;
	readonly draft: WidgetDraft | null;
	readonly columns: number;
	readonly rowHeightPx: number;
	readonly dashboard: DashboardConfig;

	// === Actions ===
	setEditable(value: boolean): void;
	selectWidget(id: string | null): void;
	patchWidget(id: string, patch: Partial<DashboardWidget>): void;
	addWidget(widget: Omit<DashboardWidget, 'id' | 'layout'> & { layout?: Partial<DashboardWidget['layout']> }): void;
	removeWidget(id: string): void;
	reset(): void;

	// === Draft actions ===
	setDraftType(type: WidgetType): void;
	patchDraft(patch: Partial<WidgetDraft>): void;
	addWidgetFromDraft(): void;
	clearDraft(): void;

	// === WidgetCanvas bindings ===
	handleWidgetsChange(widgets: DashboardWidget[]): void;
	handleFinalize(widgets: DashboardWidget[]): void;
};

/**
 * Generate a unique widget ID.
 */
function generateWidgetId(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}
	return `w-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Create a dashboard editor composable with Svelte 5 runes.
 *
 * This is the main entry point for using the dashboard editor.
 * It encapsulates all state management, persistence, and GridStack integration.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useDashboardEditor, WidgetCanvas } from '$features/dashboard-edit';
 *
 *   const editor = useDashboardEditor({
 *     initial: data.dashboard,
 *     storageKey: 'my-dashboard:v1'
 *   });
 * </script>
 *
 * <WidgetCanvas
 *   widgets={editor.widgets}
 *   editable={editor.editable}
 *   onWidgetsChange={editor.handleWidgetsChange}
 *   onFinalize={editor.handleFinalize}
 * />
 * ```
 */
export function useDashboardEditor(options: DashboardEditorOptions): DashboardEditorApi {
	const {
		initial,
		storageKey = null,
		columns = DEFAULT_GRID_CONFIG.columns,
		rowHeightPx = DEFAULT_GRID_CONFIG.rowHeightPx,
		autoSaveDelayMs = 500,
		endpoint
	} = options;

	// === Reactive state ===
	let _widgets = $state<DashboardWidget[]>(initial.widgets);
	let _selectedId = $state<string | null>(null);
	let _editable = $state(true);
	let _saveState = $state<SaveState>('idle');
	let _lastError = $state<string | null>(null);
	let _draft = $state<WidgetDraft | null>(null);

	// === Derived state ===
	const _selectedWidget = $derived(_selectedId ? _widgets.find((w) => w.id === _selectedId) ?? null : null);
	const _dashboard = $derived({ ...initial, widgets: _widgets });

	// === Saver (only if storageKey provided) ===
	const saver = storageKey
		? createDebouncedDashboardSaver({
				storageKey,
				endpoint,
				delayMs: autoSaveDelayMs,
				onStateChange: (state, err) => {
					_saveState = state;
					_lastError = err ? String(err) : null;
				}
			})
		: null;

	// === Internal helpers ===
	function saveNow() {
		if (saver) {
			saver.save(_dashboard);
		}
	}

	// === Actions ===
	function setEditable(value: boolean) {
		_editable = value;
	}

	function selectWidget(id: string | null) {
		_selectedId = id;
		if (id !== null) {
			_draft = null;
		}
	}

	function patchWidget(id: string, patch: Partial<DashboardWidget>) {
		_widgets = _widgets.map((w) => (w.id === id ? { ...w, ...patch } : w));
		saveNow();
	}

	function addWidget(
		widget: Omit<DashboardWidget, 'id' | 'layout'> & { layout?: Partial<DashboardWidget['layout']> }
	) {
		const id = generateWidgetId();
		const newWidget: DashboardWidget = {
			...widget,
			id,
			layout: {
				x: widget.layout?.x ?? 0,
				y: widget.layout?.y ?? 0,
				w: widget.layout?.w ?? 3,
				h: widget.layout?.h ?? 3
			}
		};

		_widgets = placeWidgetInFirstFreeSlot(_widgets, newWidget, columns);
		_selectedId = id;
		saveNow();
	}

	function removeWidget(id: string) {
		_widgets = _widgets.filter((w) => w.id !== id);
		if (_selectedId === id) {
			_selectedId = null;
		}
		saveNow();
	}

	function reset() {
		if (storageKey) {
			clearDashboardStorage(storageKey);
		}
		_widgets = initial.widgets;
		_selectedId = null;
		_draft = null;
		_saveState = 'idle';
		_lastError = null;
	}

	// === Draft actions ===
	function setDraftType(type: WidgetType) {
		_selectedId = null;
		_draft = {
			type,
			title: `New ${type.toUpperCase()}`,
			measure: 'revenue',
			dimension: 'date'
		};
	}

	function patchDraft(patch: Partial<WidgetDraft>) {
		if (!_draft) return;
		_draft = { ..._draft, ...patch };
	}

	function addWidgetFromDraft() {
		if (!_draft) return;

		addWidget({
			type: _draft.type,
			title: _draft.title,
			config: {
				measure: _draft.measure,
				dimension: _draft.dimension
			}
		});

		_draft = null;
	}

	function clearDraft() {
		_draft = null;
	}

	// === WidgetCanvas bindings ===
	function handleWidgetsChange(widgets: DashboardWidget[]) {
		_widgets = widgets;
	}

	function handleFinalize(widgets: DashboardWidget[]) {
		_widgets = widgets;
		saveNow();
	}

	// === Load from storage on mount ===
	onMount(() => {
		if (storageKey && browser) {
			const stored = loadDashboardFromStorage(storageKey);
			if (stored?.widgets?.length) {
				_widgets = stored.widgets;
			}
		}
	});

	// === Return API ===
	return {
		get widgets() {
			return _widgets;
		},
		get selectedWidget() {
			return _selectedWidget;
		},
		get selectedId() {
			return _selectedId;
		},
		get editable() {
			return _editable;
		},
		get saveState() {
			return _saveState;
		},
		get lastError() {
			return _lastError;
		},
		get draft() {
			return _draft;
		},
		get columns() {
			return columns;
		},
		get rowHeightPx() {
			return rowHeightPx;
		},
		get dashboard() {
			return _dashboard;
		},

		setEditable,
		selectWidget,
		patchWidget,
		addWidget,
		removeWidget,
		reset,

		setDraftType,
		patchDraft,
		addWidgetFromDraft,
		clearDraft,

		handleWidgetsChange,
		handleFinalize
	};
}
