import { describe, it, expect } from 'vitest';
import { genericCompile } from './genericCompile';
import type { DatasetFieldDef, DatasetFilterBinding } from '../model';

const fields: DatasetFieldDef[] = [
	{ name: 'id', type: 'string' },
	{ name: 'status', type: 'string', filterable: true, sortable: true },
	{ name: 'amount', type: 'number', sortable: true },
	{ name: 'created_at', type: 'datetime', filterable: true },
	{ name: 'internal_code', type: 'string', hidden: true },
];

const bindings: DatasetFilterBinding[] = [
	{ param: 'status', field: 'status', op: 'eq' },
	{ param: 'dateFrom', field: 'created_at', op: 'gte' },
	{ param: 'dateTo', field: 'created_at', op: 'lte' },
];

const entry = {
	datasetId: 'test.generic',
	fields,
	queryBindings: { filters: bindings },
};

describe('genericCompile', () => {
	it('selects all visible fields by default', () => {
		const ir = genericCompile(entry, {});
		expect(ir.kind).toBe('select');
		expect(ir.from).toEqual({ kind: 'dataset', id: 'test.generic' });
		// 4 visible fields (internal_code is hidden)
		expect(ir.select).toHaveLength(4);
		const names = ir.select.map(s => s.expr.kind === 'col' ? s.expr.name : null);
		expect(names).toContain('id');
		expect(names).toContain('status');
		expect(names).toContain('amount');
		expect(names).toContain('created_at');
		expect(names).not.toContain('internal_code');
	});

	it('applies eq filter from queryBindings', () => {
		const ir = genericCompile(entry, { status: 'active' });
		expect(ir.where).toBeDefined();
		expect(ir.where!.kind).toBe('and');
	});

	it('applies gte/lte range filters', () => {
		const ir = genericCompile(entry, { dateFrom: '2024-01-01', dateTo: '2024-12-31' });
		expect(ir.where).toBeDefined();
		if (ir.where!.kind === 'and') {
			expect(ir.where!.items).toHaveLength(2);
		}
	});

	it('skips null/undefined/empty filter values', () => {
		const ir = genericCompile(entry, { status: null, dateFrom: undefined, dateTo: '' });
		expect(ir.where).toBeUndefined();
	});

	it('applies ORDER BY from sortBy/sortDir params', () => {
		const ir = genericCompile(entry, { sortBy: 'status', sortDir: 'desc' });
		expect(ir.orderBy).toHaveLength(1);
		expect(ir.orderBy![0].dir).toBe('desc');
	});

	it('defaults sortDir to asc', () => {
		const ir = genericCompile(entry, { sortBy: 'amount' });
		expect(ir.orderBy![0].dir).toBe('asc');
	});

	it('rejects unknown sort fields', () => {
		expect(() => genericCompile(entry, { sortBy: 'unknown' })).toThrow('non-sortable');
	});

	it('rejects non-sortable fields', () => {
		expect(() => genericCompile(entry, { sortBy: 'id' })).toThrow('non-sortable');
	});

	it('applies LIMIT and OFFSET from params', () => {
		const ir = genericCompile(entry, { limit: 100, offset: 50 });
		expect(ir.limit).toBe(100);
		expect(ir.offset).toBe(50);
	});

	it('omits LIMIT/OFFSET when not provided', () => {
		const ir = genericCompile(entry, {});
		expect(ir.limit).toBeUndefined();
		expect(ir.offset).toBeUndefined();
	});

	it('works with no queryBindings', () => {
		const entryNoBindings = { datasetId: 'test.no_bindings', fields };
		const ir = genericCompile(entryNoBindings, { limit: 10 });
		expect(ir.select).toHaveLength(4);
		expect(ir.where).toBeUndefined();
		expect(ir.limit).toBe(10);
	});

	it('handles IN filter with array value', () => {
		const inEntry = {
			datasetId: 'test.in',
			fields,
			queryBindings: {
				filters: [{ param: 'statuses', field: 'status', op: 'in' as const }],
			},
		};
		const ir = genericCompile(inEntry, { statuses: ['active', 'pending'] });
		expect(ir.where).toBeDefined();
	});

	it('skips IN filter with empty array', () => {
		const inEntry = {
			datasetId: 'test.in_empty',
			fields,
			queryBindings: {
				filters: [{ param: 'statuses', field: 'status', op: 'in' as const }],
			},
		};
		const ir = genericCompile(inEntry, { statuses: [] });
		expect(ir.where).toBeUndefined();
	});
});
