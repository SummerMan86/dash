/**
 * Integration test for clickhouseProvider against a live ClickHouse container.
 *
 * Prerequisites:
 *   docker compose up -d clickhouse
 *   The test_payments table must exist in the analytics database.
 *
 * Run: pnpm vitest run packages/platform-datasets/src/server/providers/clickhouseProvider.integration.test.ts
 */
import { config } from 'dotenv';
// Load .env from repo root before anything reads process.env
config({ path: new URL('../../../../../.env', import.meta.url).pathname });

import { describe, it, expect, afterAll } from 'vitest';
import { createClient } from '@clickhouse/client';
import { clickhouseProvider, _closeClientForTesting } from './clickhouseProvider';
import type { ProviderEntry, ServerContext } from '../../model';
import type { DatasetIr } from '../../model';
import { CONTRACT_VERSION } from '../../model';

// ---------------------------------------------------------------------------
// Connectivity pre-check — runs once, synchronously gates the suite
// ---------------------------------------------------------------------------

async function isClickHouseReachable(): Promise<boolean> {
	const password = process.env.CLICKHOUSE_PASSWORD;
	if (!password) return false;
	try {
		const client = createClient({
			url: process.env.CLICKHOUSE_URL ?? 'http://localhost:8123',
			username: process.env.CLICKHOUSE_USER ?? 'default',
			password,
			database: 'analytics',
		});
		const result = await client.query({ query: 'SELECT 1', format: 'JSONEachRow' });
		await result.json();
		await client.close();
		return true;
	} catch {
		return false;
	}
}

const chAvailable = await isClickHouseReachable();

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const testEntry: ProviderEntry = {
	datasetId: 'test.payments',
	source: { kind: 'clickhouse', database: 'analytics', table: 'test_payments' },
	fields: [
		{ name: 'event_date', type: 'date' },
		{ name: 'service', type: 'string' },
		{ name: 'total_count', type: 'number' },
		{ name: 'total_amount', type: 'number' },
		{ name: 'rejected_count', type: 'number' },
	],
	execution: { timeoutMs: 5_000 },
};

const ctx: ServerContext = { tenantId: 'test-tenant' };

function allColumns(): DatasetIr {
	return {
		kind: 'select',
		from: { kind: 'dataset', id: 'test.payments' },
		select: testEntry.fields.map(f => ({ expr: { kind: 'col' as const, name: f.name } })),
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe.runIf(chAvailable)('clickhouseProvider integration', () => {
	afterAll(async () => {
		await _closeClientForTesting();
	});

	it('returns all rows with correct DatasetResponse shape', async () => {
		const ir = allColumns();
		const result = await clickhouseProvider.execute(ir, testEntry, ctx);

		expect(result.contractVersion).toBe(CONTRACT_VERSION);
		expect(result.datasetId).toBe('test.payments');
		expect(result.fields).toHaveLength(5);
		expect(result.fields.map(f => f.name)).toEqual([
			'event_date', 'service', 'total_count', 'total_amount', 'rejected_count',
		]);
		expect(result.rows).toHaveLength(6);
		expect(result.meta.sourceKind).toBe('clickhouse');
		expect(result.meta.tenantId).toBe('test-tenant');
	});

	it('applies WHERE filter', async () => {
		const ir: DatasetIr = {
			...allColumns(),
			where: {
				kind: 'bin',
				op: '=',
				left: { kind: 'col', name: 'service' },
				right: { kind: 'lit', value: 'SWIFT' },
			},
		};
		const result = await clickhouseProvider.execute(ir, testEntry, ctx);

		expect(result.rows).toHaveLength(3);
		for (const row of result.rows) {
			expect(row.service).toBe('SWIFT');
		}
	});

	it('applies ORDER BY', async () => {
		const ir: DatasetIr = {
			...allColumns(),
			orderBy: [{ expr: { kind: 'col', name: 'total_count' }, dir: 'desc' }],
		};
		const result = await clickhouseProvider.execute(ir, testEntry, ctx);

		const counts = result.rows.map(r => Number(r.total_count));
		for (let i = 1; i < counts.length; i++) {
			expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
		}
	});

	it('applies LIMIT', async () => {
		const ir: DatasetIr = {
			...allColumns(),
			orderBy: [{ expr: { kind: 'col', name: 'event_date' }, dir: 'asc' }],
			limit: 2,
		};
		const result = await clickhouseProvider.execute(ir, testEntry, ctx);

		expect(result.rows).toHaveLength(2);
		expect(result.meta.limit).toBe(2);
	});

	it('applies LIMIT + OFFSET', async () => {
		const ir: DatasetIr = {
			...allColumns(),
			orderBy: [
				{ expr: { kind: 'col', name: 'event_date' }, dir: 'asc' },
				{ expr: { kind: 'col', name: 'service' }, dir: 'asc' },
			],
			limit: 2,
			offset: 2,
		};
		const result = await clickhouseProvider.execute(ir, testEntry, ctx);

		expect(result.rows).toHaveLength(2);
		expect(result.meta.offset).toBe(2);
	});

	it('applies IN filter', async () => {
		const ir: DatasetIr = {
			...allColumns(),
			where: {
				kind: 'bin',
				op: 'in',
				left: { kind: 'col', name: 'service' },
				right: { kind: 'lit', value: ['SWIFT', 'SEPA'] },
			},
		};
		const result = await clickhouseProvider.execute(ir, testEntry, ctx);

		expect(result.rows).toHaveLength(6);
	});

	it('rejects unknown column', async () => {
		const ir: DatasetIr = {
			kind: 'select',
			from: { kind: 'dataset', id: 'test.payments' },
			select: [{ expr: { kind: 'col', name: 'nonexistent' } }],
		};

		await expect(clickhouseProvider.execute(ir, testEntry, ctx))
			.rejects.toThrow('unknown column');
	});
});
