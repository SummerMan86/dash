import { browser } from '$app/environment';
import type { DashboardConfig } from './types';

/**
 * Simple save-state machine for UI feedback.
 *
 * - idle: nothing scheduled
 * - scheduled: save is debounced (waiting)
 * - saving: writing to localStorage and/or sending request
 * - saved: last save finished successfully
 * - error: last save failed (non-abort)
 */
export type SaveState = 'idle' | 'scheduled' | 'saving' | 'saved' | 'error';

export type DebouncedSaverOptions = {
	storageKey: string;
	endpoint?: string;
	delayMs?: number;
	onStateChange?: (state: SaveState, error?: unknown) => void;
};

export function loadDashboardFromStorage(storageKey: string): DashboardConfig | null {
	if (!browser) return null;

	try {
		// localStorage returns strings; we store JSON here.
		const raw = localStorage.getItem(storageKey);
		if (!raw) return null;
		return JSON.parse(raw) as DashboardConfig;
	} catch {
		return null;
	}
}

export function clearDashboardStorage(storageKey: string) {
	if (!browser) return;
	localStorage.removeItem(storageKey);
}

/**
 * Debounced saver that:
 * - coalesces many small changes into a single save
 * - aborts in-flight requests when a newer save is scheduled (latest wins)
 *
 * In this MVP we always persist to localStorage.
 * `endpoint` is optional and useful for observing abort/race behavior in dev tools.
 */
export function createDebouncedDashboardSaver(options: DebouncedSaverOptions) {
	const { storageKey, endpoint, delayMs = 500, onStateChange = () => undefined } = options;

	// AbortController is used to cancel an in-flight request if a newer save happens.
	let abortController: AbortController | null = null;
	// Debounce timer handle.
	let saveTimeout: ReturnType<typeof setTimeout> | null = null;

	function cancel() {
		if (saveTimeout) {
			clearTimeout(saveTimeout);
			saveTimeout = null;
		}

		if (abortController) {
			abortController.abort();
			abortController = null;
		}

		onStateChange('idle');
	}

	function save(dashboard: DashboardConfig) {
		if (!browser) return;

		// Cancel previous debounce and request
		if (saveTimeout) clearTimeout(saveTimeout);
		if (abortController) abortController.abort();

		abortController = new AbortController();
		onStateChange('scheduled');

		saveTimeout = setTimeout(async () => {
			onStateChange('saving');

			try {
				// Persist locally so refresh/reload keeps the layout (MVP persistence).
				localStorage.setItem(storageKey, JSON.stringify(dashboard));

				// Optional server call to validate abort/race behavior in the Network tab.
				if (endpoint) {
					await fetch(endpoint, {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify(dashboard),
						signal: abortController?.signal
					});
				}

				onStateChange('saved');
			} catch (e: unknown) {
				// If we aborted because a newer save was scheduled, ignore this error.
				if (isAbortError(e)) return;
				onStateChange('error', e);
			}
		}, delayMs);
	}

	return { save, cancel };
}

function isAbortError(error: unknown): boolean {
	if (error instanceof DOMException) return error.name === 'AbortError';
	if (typeof error !== 'object' || error === null) return false;
	if (!('name' in error)) return false;
	return (error as { name?: unknown }).name === 'AbortError';
}
