import type { JsonValue } from '$entities/dataset';
import { browser } from '$app/environment';
import { onDestroy } from 'svelte';
import { derived, type Readable } from 'svelte/store';

import type {
	FilterSpec,
	FilterValue,
	FilterValues,
	ResolvedFilterSpec,
	FilterRuntimeContext,
	NormalizedFilterScope
} from './types';
import {
	registerWorkspaceFilters,
	resolveFilterSpecsForRuntime,
	unregisterWorkspaceFilters
} from './registry';
import { planFiltersForTarget, type FilterPlan } from './planner';
import {
	filterRuntimeState,
	getActiveFilterRuntime,
	getRuntimeFilterSnapshot,
	getRuntimeRawSnapshot,
	getRuntimeSnapshotForState,
	resetRuntimeScope,
	setActiveFilterRuntime,
	setRuntimeFilter,
	setRuntimeFilters
} from './store.svelte';
import {
	readRuntimeSnapshotFromSearchParams,
	writeRuntimeSnapshotToSearchParams
} from './serialization';

export type FilterWorkspaceRuntime = {
	workspaceId: string;
	ownerId: string;
	context: FilterRuntimeContext;
	resolvedSpecs: ResolvedFilterSpec[];
	effective: Readable<FilterValues>;
	raw: Readable<FilterValues>;
	getSnapshot: () => FilterValues;
	getRawSnapshot: () => FilterValues;
	setFilter: (filterId: string, value: FilterValue) => void;
	setFilters: (values: FilterValues) => void;
	resetScope: (scope: NormalizedFilterScope | 'all') => void;
	getPlan: (targetId: string) => FilterPlan;
	getServerParams: (targetId: string) => Record<string, JsonValue>;
};

type UseFilterWorkspaceOptions = {
	workspaceId: string;
	ownerId: string;
	specs: FilterSpec[];
	syncUrl?: boolean;
	activate?: boolean;
};

export function useFilterWorkspace(options: UseFilterWorkspaceOptions): FilterWorkspaceRuntime {
	const context: FilterRuntimeContext = {
		workspaceId: options.workspaceId,
		ownerId: options.ownerId
	};
	const resolvedSpecs = resolveFilterSpecsForRuntime(context, options.specs);

	if (browser) {
		registerWorkspaceFilters(context, options.specs);

		if (options.activate !== false) {
			setActiveFilterRuntime(context);
		}

		if (options.syncUrl !== false) {
			const initialValues = readRuntimeSnapshotFromSearchParams(
				new URLSearchParams(window.location.search),
				resolvedSpecs
			);
			if (Object.keys(initialValues).length > 0) {
				setRuntimeFilters(context, initialValues, resolvedSpecs);
			}
		}
	}

	const effective = derived(filterRuntimeState, ($state) =>
		getRuntimeSnapshotForState($state, context, resolvedSpecs, true)
	);
	const raw = derived(filterRuntimeState, ($state) =>
		getRuntimeSnapshotForState($state, context, resolvedSpecs, false)
	);

	let unsubscribeUrlSync = () => {};
	if (browser && options.syncUrl !== false) {
		unsubscribeUrlSync = raw.subscribe((snapshot) => {
			const current = new URLSearchParams(window.location.search);
			const next = writeRuntimeSnapshotToSearchParams(current, resolvedSpecs, snapshot);
			const nextSearch = next.toString();
			const nextHref = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
			const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;

			if (nextHref !== currentHref) {
				window.history.replaceState(window.history.state, '', nextHref);
			}
		});
	}

	onDestroy(() => {
		unsubscribeUrlSync();

		if (!browser) return;

		unregisterWorkspaceFilters(
			context,
			resolvedSpecs.map((spec) => spec.registrationKey)
		);

		const activeRuntime = getActiveFilterRuntime();
		if (
			activeRuntime &&
			activeRuntime.workspaceId === context.workspaceId &&
			activeRuntime.ownerId === context.ownerId
		) {
			setActiveFilterRuntime(null);
		}
	});

	return {
		workspaceId: context.workspaceId,
		ownerId: context.ownerId,
		context,
		resolvedSpecs,
		effective,
		raw,
		getSnapshot: () => getRuntimeFilterSnapshot(context, resolvedSpecs),
		getRawSnapshot: () => getRuntimeRawSnapshot(context, resolvedSpecs),
		setFilter: (filterId, value) => setRuntimeFilter(context, filterId, value, resolvedSpecs),
		setFilters: (values) => setRuntimeFilters(context, values, resolvedSpecs),
		resetScope: (scope) => resetRuntimeScope(context, scope, resolvedSpecs),
		getPlan: (targetId) =>
			planFiltersForTarget(targetId, getRuntimeFilterSnapshot(context, resolvedSpecs), context),
		getServerParams: (targetId) =>
			planFiltersForTarget(targetId, getRuntimeFilterSnapshot(context, resolvedSpecs), context)
				.serverParams
	};
}
