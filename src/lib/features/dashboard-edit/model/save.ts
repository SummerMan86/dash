import { browser } from '$app/environment';
import type { DashboardConfig } from './types';

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

export function createDebouncedDashboardSaver(options: DebouncedSaverOptions) {
	const { storageKey, endpoint, delayMs = 500, onStateChange = () => undefined } = options;

	let abortController: AbortController | null = null;
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
				// Persist locally for "reload persists" demo
				localStorage.setItem(storageKey, JSON.stringify(dashboard));

				// Optional server call to validate abort/race behaviour in Network tab
				if (endpoint) {
					await fetch(endpoint, {
						method: 'POST',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify(dashboard),
						signal: abortController?.signal
					});
				}

				onStateChange('saved');
			} catch (e: any) {
				if (e?.name === 'AbortError') return;
				onStateChange('error', e);
			}
		}, delayMs);
	}

	return { save, cancel };
}
