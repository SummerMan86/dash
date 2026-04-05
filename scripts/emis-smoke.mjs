import 'dotenv/config';

import net from 'node:net';
import { spawn } from 'node:child_process';

const DEFAULT_HOST = '127.0.0.1';
const STARTUP_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 15_000;
const LOG_BUFFER_LIMIT = 120;

function printUsage() {
	console.log('Usage:');
	console.log('  pnpm emis:smoke');
	console.log('  pnpm emis:smoke -- --base-url http://127.0.0.1:4173');
}

function readOption(name) {
	const index = process.argv.findIndex((arg) => arg === name);
	if (index === -1) return null;
	return process.argv[index + 1] ?? null;
}

function makeHeaders(extra = {}) {
	return {
		accept: 'application/json',
		...extra
	};
}

function withTimeout(promise, timeoutMs, label) {
	const controller = new AbortController();
	const timer = setTimeout(
		() => controller.abort(`${label} timed out after ${timeoutMs}ms`),
		timeoutMs
	);

	return Promise.race([
		promise(controller.signal),
		new Promise((_, reject) => {
			controller.signal.addEventListener(
				'abort',
				() => reject(new Error(String(controller.signal.reason ?? `${label} timed out`))),
				{ once: true }
			);
		})
	]).finally(() => {
		clearTimeout(timer);
	});
}

async function getFreePort() {
	return await new Promise((resolve, reject) => {
		const server = net.createServer();
		server.unref();
		server.on('error', reject);
		server.listen(0, DEFAULT_HOST, () => {
			const address = server.address();
			if (!address || typeof address === 'string') {
				server.close(() => reject(new Error('Failed to allocate free port')));
				return;
			}
			server.close((error) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(address.port);
			});
		});
	});
}

async function waitForServer(baseUrl, timeoutMs) {
	const startedAt = Date.now();

	while (Date.now() - startedAt < timeoutMs) {
		try {
			const response = await fetch(`${baseUrl}/`, { method: 'GET' });
			if (response.ok || response.status === 404) return;
		} catch {
			// keep polling
		}

		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	throw new Error(`Timed out waiting for dev server at ${baseUrl}`);
}

function pushLog(buffer, chunk) {
	const text = chunk.toString().trim();
	if (!text) return;

	for (const line of text.split(/\r?\n/)) {
		if (!line.trim()) continue;
		buffer.push(line);
		if (buffer.length > LOG_BUFFER_LIMIT) {
			buffer.shift();
		}
	}
}

async function startLocalServer() {
	const port = await getFreePort();
	const baseUrl = `http://${DEFAULT_HOST}:${port}`;
	const stdout = [];
	const stderr = [];
	const child = spawn(
		'pnpm',
		['exec', 'vite', 'dev', '--host', DEFAULT_HOST, '--port', String(port), '--strictPort'],
		{
			stdio: ['ignore', 'pipe', 'pipe'],
			env: process.env,
			cwd: new URL('../apps/web', import.meta.url).pathname
		}
	);

	child.stdout.on('data', (chunk) => pushLog(stdout, chunk));
	child.stderr.on('data', (chunk) => pushLog(stderr, chunk));

	const exitPromise = new Promise((resolve) => {
		child.on('exit', (code, signal) => resolve({ code, signal }));
	});

	try {
		await waitForServer(baseUrl, STARTUP_TIMEOUT_MS);
		return {
			baseUrl,
			stop: async () => {
				child.kill('SIGINT');
				await Promise.race([exitPromise, new Promise((resolve) => setTimeout(resolve, 5_000))]);
				if (!child.killed) child.kill('SIGKILL');
			},
			getLogs: () => ({ stdout: [...stdout], stderr: [...stderr] })
		};
	} catch (error) {
		child.kill('SIGKILL');
		await exitPromise.catch(() => {});
		throw Object.assign(error instanceof Error ? error : new Error(String(error)), {
			serverLogs: { stdout, stderr }
		});
	}
}

async function fetchJson(baseUrl, path, options = {}) {
	return await withTimeout(
		async (signal) => {
			const response = await fetch(`${baseUrl}${path}`, { ...options, signal });
			const text = await response.text();
			let data = null;

			try {
				data = text ? JSON.parse(text) : null;
			} catch {
				data = text;
			}

			return { response, data, text };
		},
		REQUEST_TIMEOUT_MS,
		`${options.method ?? 'GET'} ${path}`
	);
}

async function fetchText(baseUrl, path) {
	return await withTimeout(
		async (signal) => {
			const response = await fetch(`${baseUrl}${path}`, { method: 'GET', signal });
			const text = await response.text();
			return { response, text };
		},
		REQUEST_TIMEOUT_MS,
		`GET ${path}`
	);
}

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

function assertArray(value, label) {
	assert(Array.isArray(value), `${label} must be an array`);
	return value;
}

function hasField(fields, name) {
	return Array.isArray(fields) && fields.some((field) => field?.name === name);
}

function pageCheck(path, marker) {
	return {
		kind: 'page',
		name: path,
		run: async (baseUrl) => {
			const { response, text } = await fetchText(baseUrl, path);
			assert(response.ok, `${path} returned ${response.status}`);
			assert(text.includes(marker), `${path} is missing marker "${marker}"`);
			return { status: response.status, marker };
		}
	};
}

function jsonCheck(name, path, validate, options = {}) {
	return {
		kind: 'json',
		name,
		run: async (baseUrl) => {
			const { response, data } = await fetchJson(baseUrl, path, options);
			assert(response.ok, `${name} returned ${response.status}`);
			validate(data);
			return { status: response.status };
		}
	};
}

/**
 * Check that an error response has the expected status and { error, code } shape.
 */
function errorCheck(name, path, expectedStatus, options = {}) {
	return {
		kind: 'error',
		name,
		run: async (baseUrl) => {
			const { response, data } = await fetchJson(baseUrl, path, options);
			assert(
				response.status === expectedStatus,
				`${name}: expected status ${expectedStatus}, got ${response.status}`
			);
			assert(typeof data?.error === 'string', `${name}: error must be a string`);
			assert(typeof data?.code === 'string', `${name}: code must be a string`);
			return { status: response.status, code: data.code };
		}
	};
}

/**
 * Validate standard EMIS list meta shape: { count, limit, offset, sort[] }
 */
function assertListMeta(meta, label) {
	assert(meta !== null && typeof meta === 'object', `${label}: meta must be an object`);
	assert(typeof meta.count === 'number', `${label}: meta.count must be a number`);
	assert(typeof meta.limit === 'number', `${label}: meta.limit must be a number`);
	assert(typeof meta.offset === 'number', `${label}: meta.offset must be a number`);
	assertArray(meta.sort, `${label}: meta.sort`);
	for (const rule of meta.sort) {
		assert(typeof rule.field === 'string', `${label}: sort.field must be a string`);
		assert(rule.dir === 'asc' || rule.dir === 'desc', `${label}: sort.dir must be asc|desc`);
	}
}

function assertSortRules(actual, expected, label) {
	assertArray(actual, `${label}: sort`);
	assert(
		actual.length === expected.length,
		`${label}: expected ${expected.length} sort rules, got ${actual.length}`
	);

	for (let index = 0; index < expected.length; index += 1) {
		const actualRule = actual[index];
		const expectedRule = expected[index];
		assert(
			actualRule?.field === expectedRule.field,
			`${label}: sort[${index}].field should be ${expectedRule.field}`
		);
		assert(
			actualRule?.dir === expectedRule.dir,
			`${label}: sort[${index}].dir should be ${expectedRule.dir}`
		);
	}
}

function shipRouteSliceCheck(name, endpoint, expectedSort) {
	return {
		kind: 'json',
		name,
		run: async (baseUrl) => {
			const vessels = await fetchJson(baseUrl, '/api/emis/ship-routes/vessels?limit=1');
			assert(vessels.response.ok, `${name}: failed to load ship-route vessel catalog`);
			const vesselRows = assertArray(vessels.data?.rows, `${name}: vessel rows`);
			const shipHbkId = typeof vesselRows[0]?.shipHbkId === 'number' ? vesselRows[0].shipHbkId : 1;

			const { response, data } = await fetchJson(
				baseUrl,
				`${endpoint}?shipHbkId=${shipHbkId}&limit=2&offset=0`
			);
			assert(response.ok, `${name} returned ${response.status}`);
			assertArray(data?.rows, `${name}: rows`);
			assertListMeta(data?.meta, name);
			assert(data.meta.limit === 2, `${name}: meta.limit should be 2`);
			assert(data.meta.offset === 0, `${name}: meta.offset should be 0`);
			assertSortRules(data.meta.sort, expectedSort, name);
			return { status: response.status };
		}
	};
}

const checks = [
	pageCheck('/emis', 'Workspace'),
	pageCheck('/dashboard/emis', 'Read-model Overview'),
	pageCheck('/dashboard/emis/ship-routes', 'Ship Routes Read-model'),
	pageCheck('/dashboard/emis/provenance', 'Quality Filters'),
	jsonCheck('api:health', '/api/emis/health', (data) => {
		assert(data?.service === 'emis', 'health.service must be "emis"');
		assert(data?.status === 'snapshot-ready', 'health.status must be snapshot-ready');
	}),

	// --- Readiness endpoint (DB-backed) ---
	{
		kind: 'json',
		name: 'api:readyz',
		run: async (baseUrl) => {
			const { response, data } = await fetchJson(baseUrl, '/api/emis/readyz');
			// Accept both 200 (ready) and 503 (not_ready) as valid responses — the
			// endpoint itself works. We validate the shape either way.
			assert(
				response.status === 200 || response.status === 503,
				`readyz returned unexpected status ${response.status}`
			);
			assert(
				data?.status === 'ready' || data?.status === 'not_ready',
				`readyz.status must be "ready" or "not_ready", got "${data?.status}"`
			);
			assert(
				data?.checks !== null && typeof data?.checks === 'object',
				'readyz.checks must be an object'
			);
			assert(typeof data?.durationMs === 'number', 'readyz.durationMs must be a number');
			if (data?.status === 'not_ready') {
				assert(Array.isArray(data?.failures), 'readyz.failures must be an array when not_ready');
			}
			if (response.status === 200) {
				assert(data?.status === 'ready', 'readyz: 200 must mean status=ready');
				// When DB is reachable, verify some known checks are present
				assert(data.checks['database_url']?.ok === true, 'readyz: database_url check must pass');
				assert(
					data.checks['pg_connectivity']?.ok === true,
					'readyz: pg_connectivity check must pass'
				);
			}
			return { httpStatus: response.status, readyzStatus: data.status };
		}
	},

	// --- Request correlation: x-request-id propagation ---
	{
		kind: 'json',
		name: 'contract:request-id:generated',
		run: async (baseUrl) => {
			// Request without x-request-id — server should generate one and return it.
			// Only test EMIS operational endpoints (health does not go through handleEmisRoute).
			const { response } = await fetchJson(baseUrl, '/api/emis/objects?limit=1');
			const id = response.headers.get('x-request-id');
			assert(typeof id === 'string' && id.length > 0, 'EMIS route must return x-request-id');
			return { requestId: id };
		}
	},
	{
		kind: 'json',
		name: 'contract:request-id:echo',
		run: async (baseUrl) => {
			// Request WITH x-request-id — server should echo it back
			const sentId = 'smoke-test-' + Date.now().toString(36);
			const { response } = await fetchJson(baseUrl, '/api/emis/objects?limit=1', {
				headers: makeHeaders({ 'x-request-id': sentId })
			});
			const returnedId = response.headers.get('x-request-id');
			assert(
				returnedId === sentId,
				`x-request-id should be echoed back. Sent "${sentId}", got "${returnedId}"`
			);
			return { sentId, returnedId };
		}
	},

	// --- Error logging path: verify error responses include x-request-id ---
	{
		kind: 'error',
		name: 'contract:error-correlation',
		run: async (baseUrl) => {
			const sentId = 'smoke-error-' + Date.now().toString(36);
			const { response, data } = await fetchJson(baseUrl, '/api/emis/objects?limit=abc', {
				headers: makeHeaders({ 'x-request-id': sentId })
			});
			assert(response.status === 400, `expected 400, got ${response.status}`);
			assert(typeof data?.error === 'string', 'error response must have error string');
			assert(typeof data?.code === 'string', 'error response must have code string');
			const returnedId = response.headers.get('x-request-id');
			assert(
				returnedId === sentId,
				`error response should echo x-request-id. Sent "${sentId}", got "${returnedId}"`
			);
			return { status: response.status, code: data.code, requestId: returnedId };
		}
	},

	jsonCheck('api:ship-routes:vessels', '/api/emis/ship-routes/vessels?limit=5', (data) => {
		const rows = assertArray(data?.rows, 'ship-route vessels rows');
		if (rows.length > 0) {
			assert(rows[0]?.shipHbkId !== undefined, 'ship-route vessel row must include shipHbkId');
		}
		assertListMeta(data?.meta, 'ship-route vessels');
		assert(data.meta.limit === 5, 'ship-route vessels: meta.limit should echo requested limit');
		assert(data.meta.offset === 0, 'ship-route vessels: meta.offset default should be 0');
		assertSortRules(
			data.meta.sort,
			[
				{ field: 'lastFetchedAt', dir: 'desc' },
				{ field: 'shipHbkId', dir: 'asc' }
			],
			'ship-route vessels'
		);
	}),

	// --- Vessel current positions ---
	pageCheck('/emis?layer=vessels', 'Суда'),
	jsonCheck('api:map:vessels', '/api/emis/map/vessels?bbox=-180,-90,180,90&limit=5', (data) => {
		assert(data?.type === 'FeatureCollection', 'map vessels must be a FeatureCollection');
		assertArray(data?.features, 'map vessels features');
		if (data.features.length > 0) {
			const props = data.features[0].properties;
			assert(props?.kind === 'vessel', 'map vessel feature kind must be "vessel"');
			assert(typeof props?.shipHbkId === 'number', 'map vessel must include shipHbkId');
			assert(typeof props?.lastFetchedAt === 'string', 'map vessel must include lastFetchedAt');
			assert(typeof props?.lastLatitude === 'number', 'map vessel must include lastLatitude');
			assert(typeof props?.lastLongitude === 'number', 'map vessel must include lastLongitude');
		}
	}),
	jsonCheck(
		'api:ship-routes:vessels:q',
		'/api/emis/ship-routes/vessels?q=Energy&limit=5',
		(data) => {
			const rows = assertArray(data?.rows, 'vessel catalog q rows');
			for (const row of rows) {
				assert(
					row.vesselName?.toLowerCase().includes('energy') ||
						String(row.shipHbkId).includes('energy') ||
						String(row.imo ?? '').includes('energy') ||
						String(row.callsign ?? '')
							.toLowerCase()
							.includes('energy'),
					`vessel catalog q: row "${row.vesselName}" does not match q=Energy`
				);
			}
			assertListMeta(data?.meta, 'vessel catalog q');
		}
	),
	errorCheck('contract:map-vessels:no-bbox', '/api/emis/map/vessels', 400),

	// --- Runtime contract: meta shape on list endpoints ---
	jsonCheck('contract:search-objects:meta', '/api/emis/search/objects?limit=3&offset=0', (data) => {
		assertArray(data?.rows, 'search objects rows');
		assertListMeta(data?.meta, 'search objects');
		assert(data.meta.limit === 3, 'search objects: meta.limit should be 3');
		assert(data.meta.offset === 0, 'search objects: meta.offset should be 0');
		assertSortRules(
			data.meta.sort,
			[
				{ field: 'name', dir: 'asc' },
				{ field: 'id', dir: 'asc' }
			],
			'search objects'
		);
	}),
	jsonCheck('contract:search-news:meta', '/api/emis/search/news?limit=3&offset=0', (data) => {
		assertArray(data?.rows, 'search news rows');
		assertListMeta(data?.meta, 'search news');
		assert(data.meta.limit === 3, 'search news: meta.limit should be 3');
		assert(data.meta.offset === 0, 'search news: meta.offset should be 0');
		assertSortRules(
			data.meta.sort,
			[
				{ field: 'publishedAt', dir: 'desc' },
				{ field: 'id', dir: 'desc' }
			],
			'search news'
		);
	}),
	jsonCheck('contract:objects:meta', '/api/emis/objects?limit=3&offset=0', (data) => {
		assertArray(data?.rows, 'objects rows');
		assertListMeta(data?.meta, 'objects');
		assert(data.meta.limit === 3, 'objects: meta.limit should be 3');
		assert(data.meta.offset === 0, 'objects: meta.offset should be 0');
		assertSortRules(
			data.meta.sort,
			[
				{ field: 'name', dir: 'asc' },
				{ field: 'id', dir: 'asc' }
			],
			'objects'
		);
	}),
	jsonCheck('contract:news:meta', '/api/emis/news?limit=3&offset=0', (data) => {
		assertArray(data?.rows, 'news rows');
		assertListMeta(data?.meta, 'news');
		assert(data.meta.limit === 3, 'news: meta.limit should be 3');
		assert(data.meta.offset === 0, 'news: meta.offset should be 0');
		assertSortRules(
			data.meta.sort,
			[
				{ field: 'publishedAt', dir: 'desc' },
				{ field: 'id', dir: 'desc' }
			],
			'news'
		);
	}),
	shipRouteSliceCheck('contract:ship-route-points:meta', '/api/emis/ship-routes/points', [
		{ field: 'fetchedAt', dir: 'asc' },
		{ field: 'pointSeqShip', dir: 'asc' }
	]),
	shipRouteSliceCheck('contract:ship-route-segments:meta', '/api/emis/ship-routes/segments', [
		{ field: 'fromFetchedAt', dir: 'asc' },
		{ field: 'segmentSeqShip', dir: 'asc' }
	]),

	// --- Runtime contract: error shape on invalid params ---
	errorCheck('contract:objects:bad-limit', '/api/emis/objects?limit=abc', 400),
	errorCheck('contract:news:bad-limit', '/api/emis/news?limit=-1', 400),
	errorCheck('contract:vessels:bad-limit', '/api/emis/ship-routes/vessels?limit=999999', 400),
	errorCheck('contract:points:bad-shipHbkId', '/api/emis/ship-routes/points?shipHbkId=abc', 400),

	// --- Runtime contract: dataset error shape ---
	errorCheck('contract:dataset:bad-json', '/api/datasets/emis.news_flat', 400, {
		method: 'POST',
		headers: makeHeaders({ 'content-type': 'application/json' }),
		body: 'not-json'
	}),
	errorCheck('contract:dataset:bad-version', '/api/datasets/emis.news_flat', 400, {
		method: 'POST',
		headers: makeHeaders({ 'content-type': 'application/json' }),
		body: JSON.stringify({ contractVersion: 'v999', params: {} })
	}),
	errorCheck('contract:dataset:not-found', '/api/datasets/nonexistent.dataset', 404, {
		method: 'POST',
		headers: makeHeaders({ 'content-type': 'application/json' }),
		body: JSON.stringify({ contractVersion: 'v1', params: { limit: 1 } })
	}),
	jsonCheck(
		'dataset:news-flat',
		'/api/datasets/emis.news_flat',
		(data) => {
			assert(data?.contractVersion === 'v1', 'news_flat contractVersion must be v1');
			assert(hasField(data?.fields, 'published_at'), 'news_flat must expose published_at field');
			assertArray(data?.rows, 'news_flat rows');
			assert(typeof data?.meta?.limit === 'number', 'news_flat meta.limit must be a number');
			assert(data.meta.limit === 5, 'news_flat meta.limit should echo requested limit');
			assertSortRules(data?.meta?.sort, [{ field: 'published_at', dir: 'desc' }], 'news_flat meta');
		},
		{
			method: 'POST',
			headers: makeHeaders({ 'content-type': 'application/json' }),
			body: JSON.stringify({
				contractVersion: 'v1',
				params: { limit: 5 }
			})
		}
	),
	jsonCheck(
		'dataset:object-news-facts',
		'/api/datasets/emis.object_news_facts',
		(data) => {
			assert(
				hasField(data?.fields, 'news_source_origin'),
				'object_news_facts must expose news_source_origin'
			);
			assert(
				hasField(data?.fields, 'object_source_origin'),
				'object_news_facts must expose object_source_origin'
			);
			assertArray(data?.rows, 'object_news_facts rows');
			assert(
				typeof data?.meta?.limit === 'number',
				'object_news_facts meta.limit must be a number'
			);
			assert(data.meta.limit === 5, 'object_news_facts meta.limit should echo requested limit');
			assertSortRules(
				data?.meta?.sort,
				[
					{ field: 'published_at', dir: 'desc' },
					{ field: 'object_id', dir: 'asc' }
				],
				'object_news_facts meta'
			);
		},
		{
			method: 'POST',
			headers: makeHeaders({ 'content-type': 'application/json' }),
			body: JSON.stringify({
				contractVersion: 'v1',
				params: {
					limit: 5,
					newsSourceOrigin: 'manual',
					objectSourceOrigin: 'manual'
				}
			})
		}
	),
	jsonCheck(
		'dataset:objects-dim',
		'/api/datasets/emis.objects_dim',
		(data) => {
			assert(hasField(data?.fields, 'geometry_type'), 'objects_dim must expose geometry_type');
			assert(hasField(data?.fields, 'source_origin'), 'objects_dim must expose source_origin');
			assertArray(data?.rows, 'objects_dim rows');
			assert(typeof data?.meta?.limit === 'number', 'objects_dim meta.limit must be a number');
			assert(data.meta.limit === 5, 'objects_dim meta.limit should echo requested limit');
			assertSortRules(
				data?.meta?.sort,
				[
					{ field: 'object_type_code', dir: 'asc' },
					{ field: 'name', dir: 'asc' }
				],
				'objects_dim meta'
			);
		},
		{
			method: 'POST',
			headers: makeHeaders({ 'content-type': 'application/json' }),
			body: JSON.stringify({
				contractVersion: 'v1',
				params: { limit: 5 }
			})
		}
	),
	jsonCheck(
		'dataset:ship-route-vessels',
		'/api/datasets/emis.ship_route_vessels',
		(data) => {
			assert(hasField(data?.fields, 'ship_hbk_id'), 'ship_route_vessels must expose ship_hbk_id');
			assert(
				hasField(data?.fields, 'last_fetched_at'),
				'ship_route_vessels must expose last_fetched_at'
			);
			assertArray(data?.rows, 'ship_route_vessels rows');
			assert(
				typeof data?.meta?.limit === 'number',
				'ship_route_vessels meta.limit must be a number'
			);
			assert(data.meta.limit === 5, 'ship_route_vessels meta.limit should echo requested limit');
			assertSortRules(
				data?.meta?.sort,
				[
					{ field: 'last_fetched_at', dir: 'desc' },
					{ field: 'ship_hbk_id', dir: 'asc' }
				],
				'ship_route_vessels meta'
			);
		},
		{
			method: 'POST',
			headers: makeHeaders({ 'content-type': 'application/json' }),
			body: JSON.stringify({
				contractVersion: 'v1',
				params: { limit: 5 }
			})
		}
	)
];

async function runChecks(baseUrl) {
	const startedAt = Date.now();
	const results = [];

	for (const check of checks) {
		const checkStartedAt = Date.now();
		try {
			const meta = await check.run(baseUrl);
			results.push({
				name: check.name,
				kind: check.kind,
				ok: true,
				durationMs: Date.now() - checkStartedAt,
				...meta
			});
			console.log(`PASS ${check.kind.padEnd(4)} ${check.name}`);
		} catch (error) {
			results.push({
				name: check.name,
				kind: check.kind,
				ok: false,
				durationMs: Date.now() - checkStartedAt,
				error: error instanceof Error ? error.message : String(error)
			});
			console.log(`FAIL ${check.kind.padEnd(4)} ${check.name}`);
		}
	}

	return {
		startedAt: new Date(startedAt).toISOString(),
		finishedAt: new Date().toISOString(),
		durationMs: Date.now() - startedAt,
		ok: results.every((item) => item.ok),
		results
	};
}

async function main() {
	const baseUrl = readOption('--base-url');
	if (process.argv.includes('--help') || process.argv.includes('-h')) {
		printUsage();
		return;
	}

	let server = null;

	try {
		if (baseUrl) {
			console.log(`[emis:smoke] using external server ${baseUrl}`);
		} else {
			console.log('[emis:smoke] starting local Vite dev server');
			server = await startLocalServer();
			console.log(`[emis:smoke] local server ready at ${server.baseUrl}`);
		}

		const report = await runChecks(baseUrl ?? server.baseUrl);
		console.log(JSON.stringify(report, null, 2));

		if (!report.ok) {
			if (server) {
				const logs = server.getLogs();
				console.error('[emis:smoke] recent dev server stdout:');
				for (const line of logs.stdout.slice(-20)) console.error(line);
				if (logs.stderr.length) {
					console.error('[emis:smoke] recent dev server stderr:');
					for (const line of logs.stderr.slice(-20)) console.error(line);
				}
			}
			process.exitCode = 1;
		}
	} finally {
		if (server) {
			await server.stop();
		}
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	if (error?.serverLogs) {
		console.error(JSON.stringify(error.serverLogs, null, 2));
	}
	process.exit(1);
});
