import { describe, it, expect, beforeEach } from 'vitest';
import { planFiltersForDataset, planFiltersForTargets, getServerParamsForDataset } from './planner';
import {
	registerFilters,
	clearRegistry,
	registerWorkspaceFilters
} from './registry';
import type { FilterSpec, FilterValues, FilterRuntimeContext } from './types';

beforeEach(() => {
	clearRegistry();
});

const TARGET = 'test.dataset';

function serverFilter(overrides?: Partial<FilterSpec>): FilterSpec {
	return {
		id: 'status',
		type: 'select',
		label: 'Status',
		scope: 'global',
		apply: 'server',
		bindings: { [TARGET]: { field: 'status_field', param: 'status' } },
		...overrides
	};
}

function clientFilter(overrides?: Partial<FilterSpec>): FilterSpec {
	return {
		id: 'search',
		type: 'text',
		label: 'Search',
		scope: 'global',
		apply: 'client',
		bindings: { [TARGET]: { field: 'name' } },
		...overrides
	};
}

function hybridFilter(overrides?: Partial<FilterSpec>): FilterSpec {
	return {
		id: 'category',
		type: 'select',
		label: 'Category',
		scope: 'global',
		apply: 'hybrid',
		bindings: { [TARGET]: { field: 'category', param: 'cat' } },
		...overrides
	};
}

function dateRangeFilter(overrides?: Partial<FilterSpec>): FilterSpec {
	return {
		id: 'dateRange',
		type: 'dateRange',
		label: 'Period',
		scope: 'global',
		apply: 'server',
		bindings: {
			[TARGET]: {
				field: 'dt',
				rangeParams: { from: 'dateFrom', to: 'dateTo' }
			}
		},
		...overrides
	};
}

describe('planFiltersForDataset — server apply', () => {
	it('produces serverParams for server filter', () => {
		registerFilters([serverFilter()]);
		const plan = planFiltersForDataset(TARGET, { status: 'active' });

		expect(plan.serverParams).toEqual({ status: 'active' });
		expect(plan.clientFilterFn).toBeNull();
		expect(plan.appliedFilters).toContain('status');
	});

	it('skips null values', () => {
		registerFilters([serverFilter()]);
		const plan = planFiltersForDataset(TARGET, { status: null });

		expect(plan.serverParams).toEqual({});
		expect(plan.appliedFilters).toHaveLength(0);
	});

	it('skips empty string values', () => {
		registerFilters([serverFilter()]);
		const plan = planFiltersForDataset(TARGET, { status: '' });

		expect(plan.serverParams).toEqual({});
	});

	it('skips empty array values', () => {
		registerFilters([
			serverFilter({
				id: 'tags',
				type: 'multiSelect',
				bindings: { [TARGET]: { field: 'tags', transform: 'array' } }
			})
		]);
		const plan = planFiltersForDataset(TARGET, { tags: [] });

		expect(plan.serverParams).toEqual({});
	});
});

describe('planFiltersForDataset — client apply', () => {
	it('produces clientFilterFn for client filter', () => {
		registerFilters([clientFilter()]);
		const plan = planFiltersForDataset(TARGET, { search: 'test' });

		expect(plan.serverParams).toEqual({});
		expect(plan.clientFilterFn).toBeTypeOf('function');
		expect(plan.appliedFilters).toContain('search');
	});

	it('clientFilterFn matches rows correctly', () => {
		registerFilters([clientFilter()]);
		const plan = planFiltersForDataset(TARGET, { search: 'alpha' });

		expect(plan.clientFilterFn!({ name: 'Alpha Corp' })).toBe(true);
		expect(plan.clientFilterFn!({ name: 'Beta Inc' })).toBe(false);
	});
});

describe('planFiltersForDataset — hybrid apply', () => {
	it('produces both serverParams and clientFilterFn', () => {
		registerFilters([hybridFilter()]);
		const plan = planFiltersForDataset(TARGET, { category: 'tech' });

		expect(plan.serverParams).toEqual({ cat: 'tech' });
		expect(plan.clientFilterFn).toBeTypeOf('function');
	});
});

describe('planFiltersForDataset — dateRange with rangeParams', () => {
	it('emits dateFrom/dateTo server params', () => {
		registerFilters([dateRangeFilter()]);
		const filters: FilterValues = {
			dateRange: { from: '2024-01-01', to: '2024-12-31' }
		};
		const plan = planFiltersForDataset(TARGET, filters);

		expect(plan.serverParams).toEqual({
			dateFrom: '2024-01-01',
			dateTo: '2024-12-31'
		});
	});

	it('emits partial range when only from is set', () => {
		registerFilters([dateRangeFilter()]);
		const plan = planFiltersForDataset(TARGET, {
			dateRange: { from: '2024-06-01' }
		});

		expect(plan.serverParams).toEqual({ dateFrom: '2024-06-01' });
	});

	it('emits client matcher for hybrid dateRange', () => {
		registerFilters([dateRangeFilter({ apply: 'hybrid' })]);
		const plan = planFiltersForDataset(TARGET, {
			dateRange: { from: '2024-01-01', to: '2024-12-31' }
		});

		expect(plan.serverParams.dateFrom).toBe('2024-01-01');
		expect(plan.clientFilterFn).toBeTypeOf('function');
		expect(plan.clientFilterFn!({ dt: '2024-06-15' })).toBe(true);
		expect(plan.clientFilterFn!({ dt: '2023-01-01' })).toBe(false);
	});
});

describe('planFiltersForDataset — transforms', () => {
	it('applies number transform', () => {
		registerFilters([
			serverFilter({
				id: 'amount',
				bindings: { [TARGET]: { param: 'amount', transform: 'number' } }
			})
		]);
		const plan = planFiltersForDataset(TARGET, { amount: '42' });

		expect(plan.serverParams).toEqual({ amount: 42 });
	});
});

describe('getServerParamsForDataset', () => {
	it('excludes client-only filters from server params', () => {
		registerFilters([serverFilter(), clientFilter()]);
		const params = getServerParamsForDataset(TARGET, {
			status: 'active',
			search: 'test'
		});

		expect(params).toEqual({ status: 'active' });
	});
});

describe('planFiltersForDataset — runtime context', () => {
	it('uses workspace registry when context is provided', () => {
		const ctx: FilterRuntimeContext = {
			workspaceId: 'ws-1',
			ownerId: 'owner-1'
		};

		registerWorkspaceFilters(ctx, [
			{
				id: 'wsFilter',
				type: 'select',
				label: 'WS Filter',
				scope: 'owner',
				apply: 'server',
				bindings: { [TARGET]: { param: 'ws_param' } }
			}
		]);

		const plan = planFiltersForDataset(TARGET, { wsFilter: 'val' }, ctx);

		expect(plan.serverParams).toEqual({ ws_param: 'val' });
		expect(plan.appliedFilters).toContain('wsFilter');
	});
});

describe('planFiltersForTargets — batch planning', () => {
	const TARGET_A = 'test.datasetA';
	const TARGET_B = 'test.datasetB';

	it('returns plans for multiple targets', () => {
		registerFilters([
			{
				id: 'shared_filter',
				type: 'select',
				label: 'Shared',
				scope: 'global',
				apply: 'server',
				bindings: {
					[TARGET_A]: { field: 'col_a', param: 'filter_a' },
					[TARGET_B]: { field: 'col_b', param: 'filter_b' },
				},
			},
		]);

		const plans = planFiltersForTargets(
			[TARGET_A, TARGET_B],
			{ shared_filter: 'val' },
		);

		expect(plans.size).toBe(2);
		expect(plans.get(TARGET_A)?.serverParams).toEqual({ filter_a: 'val' });
		expect(plans.get(TARGET_B)?.serverParams).toEqual({ filter_b: 'val' });
	});

	it('returns empty plan for targets without bindings', () => {
		registerFilters([
			{
				id: 'only_a',
				type: 'select',
				label: 'Only A',
				scope: 'global',
				apply: 'server',
				bindings: {
					[TARGET_A]: { field: 'col', param: 'p' },
				},
			},
		]);

		const plans = planFiltersForTargets(
			[TARGET_A, TARGET_B],
			{ only_a: 'val' },
		);

		expect(plans.get(TARGET_A)?.serverParams).toEqual({ p: 'val' });
		expect(plans.get(TARGET_B)?.serverParams).toEqual({});
	});

	it('returns empty map for empty target list', () => {
		const plans = planFiltersForTargets([], { any: 'val' });
		expect(plans.size).toBe(0);
	});
});
