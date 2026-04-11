import { describe, it, expect } from 'vitest';
import { buildCacheKey } from '../providerCache';

describe('oracleProvider cache key via buildCacheKey', () => {
	it('includes sqlText in cache identity to prevent collision between different query shapes', () => {
		const a = buildCacheKey('ds1', { sqlText: 'SELECT a FROM t', binds: ['x'] }, 'tenant-1');
		const b = buildCacheKey('ds1', { sqlText: 'SELECT b FROM t', binds: ['x'] }, 'tenant-1');
		expect(a).not.toBe(b);
	});

	it('excludes requestId from key identity', () => {
		const a = buildCacheKey('ds1', { sqlText: 'SELECT a FROM t', requestId: 'r1', binds: [1] }, 'tenant-1');
		const b = buildCacheKey('ds1', { sqlText: 'SELECT a FROM t', requestId: 'r2', binds: [1] }, 'tenant-1');
		expect(a).toBe(b);
	});

	it('separates tenants for same query', () => {
		const a = buildCacheKey('ds1', { sqlText: 'SELECT a FROM t' }, 'A');
		const b = buildCacheKey('ds1', { sqlText: 'SELECT a FROM t' }, 'B');
		expect(a).not.toBe(b);
	});

	it('differentiates different bind values', () => {
		const a = buildCacheKey('ds1', { sqlText: 'SELECT a FROM t WHERE b = :b1', binds: [1] }, 'tenant-1');
		const b = buildCacheKey('ds1', { sqlText: 'SELECT a FROM t WHERE b = :b1', binds: [2] }, 'tenant-1');
		expect(a).not.toBe(b);
	});
});
