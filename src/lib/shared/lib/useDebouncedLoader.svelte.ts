import { onMount } from 'svelte';

export type DebouncedLoaderOptions<T> = {
	/**
	 * Reactive dependency getter. Read whatever should trigger reload:
	 * e.g. `() => $effectiveFilters`.
	 */
	watch?: () => unknown;
	/**
	 * Debounce delay for `watch()`-triggered reloads.
	 */
	delayMs?: number;
	/**
	 * If true (default), calls `reload()` once on mount.
	 */
	immediate?: boolean;
	/**
	 * Async loader that returns data.
	 */
	load: () => Promise<T>;
	/**
	 * Called with the latest successful result (stale results are ignored).
	 */
	onData: (data: T) => void;
	/**
	 * Called on error for the latest request (stale errors are ignored).
	 */
	onError?: (err: unknown) => void;
};

/**
 * A small composable for pages/widgets:
 * - debounced reload when `watch()` changes
 * - prevents parallel loads (queues a single rerun)
 * - ignores stale responses (only the latest load can commit)
 */
export function useDebouncedLoader<T>(opts: DebouncedLoaderOptions<T>) {
	const delayMs = opts.delayMs ?? 250;
	const immediate = opts.immediate ?? true;

	// Keep only UI-relevant pieces reactive.
	// NOTE: putting `timer` into reactive state can cause effect loops (effect reads+writes timer).
	let loading = $state(false);
	let mounted = $state(false);

	// Internal bookkeeping (non-reactive)
	let pending = false;
	let seq = 0;
	let timer: ReturnType<typeof setTimeout> | null = null;

	async function reload(): Promise<void> {
		// Avoid parallel loads; schedule one more run after current finishes.
		if (loading) {
			pending = true;
			return;
		}

		const curSeq = ++seq;
		loading = true;
		pending = false;

		try {
			const result = await opts.load();
			// Ignore stale responses if a newer load started.
			if (curSeq !== seq) return;
			opts.onData(result);
		} catch (e: unknown) {
			if (curSeq !== seq) return;
			opts.onError?.(e);
		} finally {
			if (curSeq === seq) loading = false;

			// If a watched value changed while loading, run one more load after finishing.
			if (!loading && pending) {
				pending = false;
				reload();
			}
		}
	}

	function scheduleReload(): void {
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => {
			reload();
		}, delayMs);
	}

	$effect(() => {
		if (!opts.watch) return;

		const _ = opts.watch();
		if (!mounted) return;

		scheduleReload();

		return () => {
			if (timer) clearTimeout(timer);
		};
	});

	onMount(() => {
		mounted = true;
		if (immediate) reload();

		return () => {
			mounted = false;
			if (timer) clearTimeout(timer);
		};
	});

	return {
		reload,
		get loading() {
			return loading;
		}
	};
}
