import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import type {
	DatasetRegistryEntry,
	SourceDescriptor,
	DatasetFieldDef,
	DatasetFilterBinding,
} from './registry';
import type { SelectIr } from './ir';
import { paginationParamsSchema, createSortParamsSchema } from './params';

describe('SourceDescriptor', () => {
	it('supports postgres source', () => {
		const src: SourceDescriptor = { kind: 'postgres', schema: 'public', table: 'users' };
		expect(src.kind).toBe('postgres');
	});

	it('supports oracle source', () => {
		const src: SourceDescriptor = {
			kind: 'oracle',
			connectionName: 'payments-prod',
			schema: 'PAYMENTS',
			table: 'V_TX_LIVE',
		};
		expect(src.kind).toBe('oracle');
	});

	it('supports clickhouse source', () => {
		const src: SourceDescriptor = { kind: 'clickhouse', database: 'analytics', table: 'events' };
		expect(src.kind).toBe('clickhouse');
	});

	it('supports cube source', () => {
		const src: SourceDescriptor = { kind: 'cube', cubeName: 'Orders' };
		expect(src.kind).toBe('cube');
	});

	it('supports mock source', () => {
		const src: SourceDescriptor = { kind: 'mock', fixtureId: 'payment-kpi' };
		expect(src.kind).toBe('mock');
	});
});

describe('DatasetRegistryEntry', () => {
	const paramsSchema = z.object({
		status: z.string().optional(),
		dateFrom: z.string().optional(),
	});

	const fields: DatasetFieldDef[] = [
		{ name: 'id', type: 'string' },
		{ name: 'status', type: 'string', filterable: true, sortable: true },
		{ name: 'internal_code', type: 'string', hidden: true },
	];

	it('constructs a minimal entry with declarative mode', () => {
		const entry: DatasetRegistryEntry<z.infer<typeof paramsSchema>> = {
			datasetId: 'test.example',
			source: { kind: 'postgres', schema: 'public', table: 'example' },
			fields,
			paramsSchema,
		};

		expect(entry.datasetId).toBe('test.example');
		expect(entry.source.kind).toBe('postgres');
		expect(entry.fields).toHaveLength(3);
		expect(entry.compile).toBeUndefined();
	});

	it('constructs an entry with custom compile receiving typed params', () => {
		const entry: DatasetRegistryEntry<z.infer<typeof paramsSchema>> = {
			datasetId: 'test.custom',
			source: { kind: 'postgres', schema: 'mart', table: 'data' },
			fields,
			paramsSchema,
			compile: (_id, params): SelectIr => ({
				kind: 'select',
				from: { kind: 'dataset', id: 'test.custom' },
				select: [{ expr: { kind: 'col', name: 'id' } }],
				where: params.status
					? { kind: 'bin', op: '=', left: { kind: 'col', name: 'status' }, right: { kind: 'lit', value: params.status } }
					: undefined,
			}),
		};

		const ir = entry.compile!('test.custom', { status: 'active' });
		expect(ir.kind).toBe('select');
		expect(ir.where).toBeDefined();
	});

	it('supports access, cache, and execution hints on an entry', () => {
		const entry: DatasetRegistryEntry = {
			datasetId: 'test.full',
			source: { kind: 'oracle', connectionName: 'prod', schema: 'APP', table: 'TX' },
			fields: [{ name: 'id', type: 'string' }],
			paramsSchema: z.object({}),
			access: { requiredScopes: ['bi:read', 'payments:view'] },
			cache: { ttlMs: 15_000, refreshIntervalMs: 10_000, staleWhileRevalidate: true },
			execution: { defaultLimit: 100, maxLimit: 10_000, timeoutMs: 5_000 },
		};

		expect(entry.access?.requiredScopes).toEqual(['bi:read', 'payments:view']);
		expect(entry.cache?.ttlMs).toBe(15_000);
		expect(entry.cache?.staleWhileRevalidate).toBe(true);
		expect(entry.execution?.timeoutMs).toBe(5_000);
	});

	it('supports queryBindings for declarative filter mapping', () => {
		const bindings: DatasetFilterBinding[] = [
			{ param: 'status', field: 'status', op: 'eq' },
			{ param: 'dateFrom', field: 'created_at', op: 'gte' },
			{ param: 'dateTo', field: 'created_at', op: 'lte' },
		];

		const entry: DatasetRegistryEntry = {
			datasetId: 'test.bindings',
			source: { kind: 'postgres', schema: 'public', table: 'tx' },
			fields: [
				{ name: 'status', type: 'string', filterable: true },
				{ name: 'created_at', type: 'datetime', filterable: true },
			],
			paramsSchema: z.object({
				status: z.string().optional(),
				dateFrom: z.string().optional(),
				dateTo: z.string().optional(),
			}),
			queryBindings: { filters: bindings },
		};

		expect(entry.queryBindings?.filters).toHaveLength(3);
	});
});

describe('paginationParamsSchema', () => {
	it('parses valid pagination params', () => {
		const result = paginationParamsSchema.parse({ limit: 50, offset: 10 });
		expect(result).toEqual({ limit: 50, offset: 10 });
	});

	it('applies defaults when omitted', () => {
		const result = paginationParamsSchema.parse({});
		expect(result).toEqual({ limit: 100, offset: 0 });
	});

	it('coerces string values', () => {
		const result = paginationParamsSchema.parse({ limit: '25', offset: '5' });
		expect(result).toEqual({ limit: 25, offset: 5 });
	});

	it('rejects negative offset', () => {
		expect(() => paginationParamsSchema.parse({ offset: -1 })).toThrow();
	});

	it('rejects limit exceeding max', () => {
		expect(() => paginationParamsSchema.parse({ limit: 20_000 })).toThrow();
	});

	it('rejects zero limit', () => {
		expect(() => paginationParamsSchema.parse({ limit: 0 })).toThrow();
	});
});

describe('createSortParamsSchema', () => {
	const sortSchema = createSortParamsSchema(['status', 'created_at']);

	it('parses valid sort params', () => {
		const result = sortSchema.parse({ sortBy: 'status', sortDir: 'desc' });
		expect(result).toEqual({ sortBy: 'status', sortDir: 'desc' });
	});

	it('defaults sortDir to asc', () => {
		const result = sortSchema.parse({ sortBy: 'created_at' });
		expect(result.sortDir).toBe('asc');
	});

	it('allows omitting sortBy', () => {
		const result = sortSchema.parse({});
		expect(result.sortBy).toBeUndefined();
		expect(result.sortDir).toBe('asc');
	});

	it('rejects unknown sort fields', () => {
		expect(() => sortSchema.parse({ sortBy: 'unknown_field' })).toThrow();
	});
});
