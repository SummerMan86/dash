/**
 * emis-write-smoke.mjs
 *
 * Write-side smoke for EMIS: exercises create/update/delete flows for
 * objects, news items and news-object links, then verifies emis.audit_log
 * entries directly via DATABASE_URL.
 *
 * Usage:
 *   pnpm emis:write-smoke
 *   pnpm emis:write-smoke -- --base-url http://127.0.0.1:5173
 *
 * Env:
 *   DATABASE_URL  — required (PostgreSQL connection string, same as app)
 *                   example: postgresql://postgres:SSYS@localhost:5435/dashboard
 *
 * Actor: each run gets a unique actor ID (write-smoke-<runId>) so audit_log
 * entries produced by this script are always traceable by runId.
 */

import 'dotenv/config';

// AUTH-7: default auth mode is now 'session'. Write-smoke runs without auth.
if (!process.env.EMIS_AUTH_MODE) {
	process.env.EMIS_AUTH_MODE = 'none';
}

import net from 'node:net';
import { spawn } from 'node:child_process';

import pg from 'pg';

const { Pool } = pg;

// ---------------------------------------------------------------------------
// Run identity
//
// RUN_ID   — short unique suffix, printed in report and used in actor header.
// ACTOR_ID — set as x-emis-actor-id on every write request so audit_log rows
//            can be filtered by this run.
// ---------------------------------------------------------------------------

const RUN_ID = Date.now().toString(36);
const ACTOR_ID = `write-smoke-${RUN_ID}`;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_HOST = '127.0.0.1';
const STARTUP_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 15_000;
const APP_DIR = new URL('../apps/web', import.meta.url).pathname;

// ---------------------------------------------------------------------------
// Cleanup registry
//
// Write scenarios register cleanup fns via addCleanup().
// runCleanup() is called in main() finally block — even on test failure.
// This ensures smoke-created entities are removed after every run.
//
// Usage in a scenario:
//   const id = (await POST /api/emis/objects).data.id;
//   addCleanup(`object ${id}`, () => fetchJson(baseUrl, `/api/emis/objects/${id}`, { method: 'DELETE', headers: makeWriteHeaders() }));
// ---------------------------------------------------------------------------

const cleanupFns = [];

function addCleanup(label, fn) {
	cleanupFns.push({ label, fn });
}

async function runCleanup() {
	if (cleanupFns.length === 0) return;
	console.log('[emis:write-smoke] running cleanup...');
	// Run in reverse registration order (LIFO: links before objects/news)
	for (const { label, fn } of [...cleanupFns].reverse()) {
		try {
			await fn();
			console.log(`  cleanup ok: ${label}`);
		} catch (error) {
			console.error(
				`  cleanup FAIL: ${label} — ${error instanceof Error ? error.message : String(error)}`
			);
		}
	}
}

// ---------------------------------------------------------------------------
// DB access — direct pg pool, no SvelteKit layer
//
// Why direct DB? The app has no read endpoint for emis.audit_log (it is an
// append-only internal table). Write-smoke connects directly using the same
// DATABASE_URL to verify audit entries after each mutating HTTP call.
// ---------------------------------------------------------------------------

let _pool = null;

function getPool() {
	const url = process.env.DATABASE_URL?.trim();
	if (!url) {
		throw new Error(
			'DATABASE_URL is required for write-smoke (needed for audit_log verification).\n' +
				'  Set it in .env or export it before running:\n' +
				'  DATABASE_URL=postgresql://postgres:SSYS@localhost:5435/dashboard'
		);
	}
	if (!_pool) {
		_pool = new Pool({ connectionString: url, max: 2 });
	}
	return _pool;
}

async function dbQuery(sql, params = []) {
	const client = await getPool().connect();
	try {
		return await client.query(sql, params);
	} finally {
		client.release();
	}
}

async function closePool() {
	if (_pool) {
		await _pool.end();
		_pool = null;
	}
}

// ---------------------------------------------------------------------------
// DB helpers — audit log
// ---------------------------------------------------------------------------

/**
 * Returns all audit_log rows for a given entity, ordered by occurred_at ASC.
 * Safe read-only SELECT — does not modify any data.
 */
async function getAuditLogs(entityType, entityId) {
	const result = await dbQuery(
		`SELECT
			id,
			entity_type,
			entity_id::text AS entity_id,
			action,
			actor_id,
			occurred_at,
			payload
		FROM emis.audit_log
		WHERE entity_type = $1
		  AND entity_id   = $2::uuid
		ORDER BY occurred_at ASC`,
		[entityType, entityId]
	);
	return result.rows;
}

/**
 * Verifies audit_log coverage for an entity:
 *   - each action in expectedActions has exactly 1 row
 *   - every row for this entity has actor_id === ACTOR_ID
 * Returns the list of confirmed actions for the report.
 */
async function assertAuditContract(entityType, entityId, expectedActions, label) {
	const rows = await getAuditLogs(entityType, entityId);
	assert(rows.length > 0, `${label}: no audit_log rows found for ${entityType} ${entityId}`);
	for (const action of expectedActions) {
		const count = rows.filter((r) => r.action === action).length;
		assert(count === 1, `${label}: expected 1 audit row for ${entityType}/${action}, got ${count}`);
	}
	for (const row of rows) {
		assert(
			row.actor_id === ACTOR_ID,
			`${label}: audit row actor_id must be '${ACTOR_ID}', got '${row.actor_id}'`
		);
	}
	return { auditActions: rows.map((r) => r.action) };
}

/**
 * Returns the UUID of the news_object_link row (while it still exists in the table).
 * Must be called before detach — link is hard-deleted on detach.
 */
async function getLinkId(newsId, objectId) {
	const result = await dbQuery(
		'SELECT id FROM emis.news_object_links WHERE news_id = $1 AND object_id = $2 LIMIT 1',
		[newsId, objectId]
	);
	return result.rows[0]?.id ?? null;
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

function assertOk(response, label) {
	assert(response.ok, `${label}: HTTP ${response.status}`);
}

function assertStatus(response, expected, label) {
	assert(
		response.status === expected,
		`${label}: expected HTTP ${expected}, got ${response.status}`
	);
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

/**
 * Returns headers for write requests.
 * Always includes x-emis-actor-id so audit_log rows are tagged with ACTOR_ID.
 */
function makeWriteHeaders(extra = {}) {
	return {
		'content-type': 'application/json',
		accept: 'application/json',
		'x-emis-actor-id': ACTOR_ID,
		...extra
	};
}

function makeReadHeaders() {
	return { accept: 'application/json' };
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
	]).finally(() => clearTimeout(timer));
}

async function fetchJson(baseUrl, path, options = {}) {
	return withTimeout(
		async (signal) => {
			const response = await fetch(`${baseUrl}${path}`, { ...options, signal });
			const text = await response.text();
			let data = null;
			try {
				data = text ? JSON.parse(text) : null;
			} catch {
				data = text;
			}
			return { response, data };
		},
		REQUEST_TIMEOUT_MS,
		`${options.method ?? 'GET'} ${path}`
	);
}

// ---------------------------------------------------------------------------
// Dev server lifecycle — mirrors emis-smoke.mjs
// ---------------------------------------------------------------------------

function readOption(name) {
	const index = process.argv.findIndex((arg) => arg === name);
	if (index === -1) return null;
	return process.argv[index + 1] ?? null;
}

async function getFreePort() {
	return new Promise((resolve, reject) => {
		const server = net.createServer();
		server.unref();
		server.on('error', reject);
		server.listen(0, DEFAULT_HOST, () => {
			const address = server.address();
			if (!address || typeof address === 'string') {
				server.close(() => reject(new Error('Failed to allocate free port')));
				return;
			}
			server.close((err) => (err ? reject(err) : resolve(address.port)));
		});
	});
}

function pushLog(buffer, chunk) {
	const text = chunk.toString().trim();
	if (!text) return;
	for (const line of text.split(/\r?\n/)) {
		if (line.trim()) buffer.push(line);
		if (buffer.length > 120) buffer.shift();
	}
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

async function startLocalServer() {
	const port = await getFreePort();
	const baseUrl = `http://${DEFAULT_HOST}:${port}`;
	const stdout = [];
	const stderr = [];
	const child = spawn(
		'pnpm',
		['exec', 'vite', 'dev', '--host', DEFAULT_HOST, '--port', String(port), '--strictPort'],
		{ stdio: ['ignore', 'pipe', 'pipe'], env: process.env, cwd: APP_DIR }
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
				await Promise.race([exitPromise, new Promise((r) => setTimeout(r, 5_000))]);
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

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

/**
 * db:connectivity — verifies DATABASE_URL works and emis.audit_log is reachable.
 * Runs before any HTTP write calls. No data is modified.
 */
async function checkDbConnectivity() {
	const ping = await dbQuery('SELECT 1 AS ok');
	assert(ping.rows[0]?.ok === 1, 'db: SELECT 1 did not return ok=1');

	const auditCheck = await dbQuery('SELECT count(*)::int AS n FROM emis.audit_log');
	assert(typeof auditCheck.rows[0]?.n === 'number', 'db: emis.audit_log is not readable');

	return { auditRowCount: auditCheck.rows[0].n };
}

/**
 * api:health — verifies the EMIS health endpoint returns expected shape.
 */
async function checkHealth(baseUrl) {
	const { response, data } = await fetchJson(baseUrl, '/api/emis/health', {
		headers: makeReadHeaders()
	});
	assertOk(response, 'api:health');
	assert(data?.service === 'emis', `api:health: service must be "emis", got ${data?.service}`);
	assert(
		data?.status === 'snapshot-ready',
		`api:health: status must be "snapshot-ready", got ${data?.status}`
	);
	return { service: data.service, status: data.status };
}

// ---------------------------------------------------------------------------
// Test data strategy
//
// ISOLATION RULE: every write-smoke run creates its own records, identifiable
// by RUN_ID. Cleanup deletes only those exact entity IDs — never queries by
// name, never touches rows created by other runs or seeded data.
//
// Fields carrying RUN_ID (searchable in list/detail/audit_log):
//
//   Object:
//     name        → "EMIS WRITE SMOKE OBJECT <runId>"   (human-readable)
//     sourceNote  → "smoke:<runId>"                      (grep-safe marker)
//     attributes  → { smokeRunId: "<runId>" }            (machine-readable)
//
//   News:
//     title       → "EMIS WRITE SMOKE NEWS <runId>"      (human-readable)
//     summary     → "smoke:<runId>"                      (grep-safe marker)
//     meta        → { smokeRunId: "<runId>" }            (machine-readable)
//
//   Link:
//     comment     → "smoke:<runId>"                      (grep-safe marker)
//
// FK REFS (objectTypeId, sourceId) are NOT hardcoded — loadSmokeRefs()
// fetches the first available row from dictionary endpoints at runtime.
// This makes the smoke independent of any particular seed state.
//
// CLEANUP ORDER (LIFO via addCleanup):
//   1. link detach  (registered last → runs first)
//   2. news delete
//   3. object delete
// ---------------------------------------------------------------------------

/**
 * Fetches the first available objectTypeId and sourceId from dictionary
 * endpoints. These are required FK refs for object/news create payloads.
 * Throws clearly if either dictionary is empty (DB not seeded).
 */
async function loadSmokeRefs(baseUrl) {
	const [typesRes, sourcesRes] = await Promise.all([
		fetchJson(baseUrl, '/api/emis/dictionaries/object-types', { headers: makeReadHeaders() }),
		fetchJson(baseUrl, '/api/emis/dictionaries/sources', { headers: makeReadHeaders() })
	]);

	assertOk(typesRes.response, 'loadSmokeRefs: object-types');
	assertOk(sourcesRes.response, 'loadSmokeRefs: sources');

	const objectTypeId = typesRes.data?.rows?.[0]?.id;
	const sourceId = sourcesRes.data?.rows?.[0]?.id;

	assert(
		typeof objectTypeId === 'string',
		'loadSmokeRefs: no object types in DB — run db:seed first'
	);
	assert(typeof sourceId === 'string', 'loadSmokeRefs: no news sources in DB — run db:seed first');

	return { objectTypeId, sourceId };
}

// ---------------------------------------------------------------------------
// Payload builders — all payloads are minimal-valid per Zod schemas.
// runId is embedded in multiple fields for traceability.
// ---------------------------------------------------------------------------

function buildObjectPayload(runId, objectTypeId) {
	return {
		objectTypeId,
		name: `EMIS WRITE SMOKE OBJECT ${runId}`,
		status: 'active',
		sourceNote: `smoke:${runId}`,
		attributes: { smokeRunId: runId },
		geometry: { type: 'Point', coordinates: [37.617, 55.755] } // Moscow, safe neutral point
	};
}

function buildObjectPatch(runId) {
	return {
		description: `smoke update: ${runId}`,
		status: 'inactive'
	};
}

function buildNewsPayload(runId, sourceId) {
	return {
		sourceId,
		title: `EMIS WRITE SMOKE NEWS ${runId}`,
		publishedAt: new Date().toISOString(),
		isManual: true,
		summary: `smoke:${runId}`,
		meta: { smokeRunId: runId }
	};
}

function buildNewsPatch(runId) {
	return {
		summary: `smoke update: ${runId}`
	};
}

function buildLinkPayload(objectId, runId) {
	return {
		links: [
			{
				objectId,
				linkType: 'mentioned',
				isPrimary: false,
				confidence: null,
				comment: `smoke:${runId}`
			}
		]
	};
}

function buildLinkPatch(runId) {
	return { isPrimary: true, confidence: 0.9, comment: `smoke update: ${runId}` };
}

// ---------------------------------------------------------------------------
// Link flow
// ---------------------------------------------------------------------------

async function smokeLinkFlow(baseUrl, refs) {
	const label = 'link-flow';
	let objectDeleted = false;
	let newsDeleted = false;
	let linkDetached = false;

	// 1. Create fresh object (prerequisite)
	const { response: objResp, data: objData } = await fetchJson(baseUrl, '/api/emis/objects', {
		method: 'POST',
		headers: makeWriteHeaders(),
		body: JSON.stringify(buildObjectPayload(RUN_ID, refs.objectTypeId))
	});
	assertStatus(objResp, 201, `${label}: create object`);
	const objectId = objData?.id;
	assert(typeof objectId === 'string', `${label}: created object must have id`);

	// Cleanup order (LIFO): link detach → news delete → object delete.
	// Register object first so it runs last.
	addCleanup(`link-flow object ${objectId}`, async () => {
		if (objectDeleted) return;
		await fetchJson(baseUrl, `/api/emis/objects/${objectId}`, {
			method: 'DELETE',
			headers: makeWriteHeaders()
		});
	});

	// 2. Create fresh news (prerequisite)
	const { response: newsResp, data: newsData } = await fetchJson(baseUrl, '/api/emis/news', {
		method: 'POST',
		headers: makeWriteHeaders(),
		body: JSON.stringify(buildNewsPayload(RUN_ID, refs.sourceId))
	});
	assertStatus(newsResp, 201, `${label}: create news`);
	const newsId = newsData?.id;
	assert(typeof newsId === 'string', `${label}: created news must have id`);

	addCleanup(`link-flow news ${newsId}`, async () => {
		if (newsDeleted) return;
		await fetchJson(baseUrl, `/api/emis/news/${newsId}`, {
			method: 'DELETE',
			headers: makeWriteHeaders()
		});
	});

	// Register link detach cleanup last (runs first in LIFO — before news/object delete).
	// Safe if attach never happened: DELETE returns 404, runCleanup catches and logs it.
	addCleanup(`link-flow link ${newsId}/${objectId}`, async () => {
		if (linkDetached) return;
		await fetchJson(baseUrl, `/api/emis/news/${newsId}/objects/${objectId}`, {
			method: 'DELETE',
			headers: makeWriteHeaders()
		});
	});

	// 3. POST attach → { ok: true }
	const { response: attachResp, data: attachData } = await fetchJson(
		baseUrl,
		`/api/emis/news/${newsId}/objects`,
		{
			method: 'POST',
			headers: makeWriteHeaders(),
			body: JSON.stringify(buildLinkPayload(objectId, RUN_ID))
		}
	);
	assertOk(attachResp, `${label}: POST attach`);
	assert(attachData?.ok === true, `${label}: attach response must be { ok: true }`);

	// 4. GET news detail → relatedObjects contains attached link
	const { response: afterAttachResp, data: afterAttachData } = await fetchJson(
		baseUrl,
		`/api/emis/news/${newsId}`,
		{ headers: makeReadHeaders() }
	);
	assertOk(afterAttachResp, `${label}: GET news detail after attach`);
	const attachedLink = (afterAttachData?.relatedObjects ?? []).find((r) => r.id === objectId);
	assert(attachedLink !== undefined, `${label}: relatedObjects must contain attached objectId`);
	assert(attachedLink?.linkType === 'mentioned', `${label}: linkType must be 'mentioned'`);
	assert(attachedLink?.isPrimary === false, `${label}: isPrimary must be false after attach`);
	assert(attachedLink?.comment === `smoke:${RUN_ID}`, `${label}: comment must carry runId`);

	// 5. PATCH update link → { ok: true }
	const { response: patchResp, data: patchData } = await fetchJson(
		baseUrl,
		`/api/emis/news/${newsId}/objects/${objectId}`,
		{
			method: 'PATCH',
			headers: makeWriteHeaders(),
			body: JSON.stringify(buildLinkPatch(RUN_ID))
		}
	);
	assertOk(patchResp, `${label}: PATCH update link`);
	assert(patchData?.ok === true, `${label}: link patch response must be { ok: true }`);

	// 6. GET news detail → verify updated fields (isPrimary, confidence, comment)
	const { response: afterPatchResp, data: afterPatchData } = await fetchJson(
		baseUrl,
		`/api/emis/news/${newsId}`,
		{ headers: makeReadHeaders() }
	);
	assertOk(afterPatchResp, `${label}: GET news detail after patch`);
	const updatedLink = (afterPatchData?.relatedObjects ?? []).find((r) => r.id === objectId);
	assert(updatedLink !== undefined, `${label}: relatedObjects must contain link after patch`);
	assert(updatedLink?.isPrimary === true, `${label}: isPrimary must be true after patch`);
	assert(
		Math.abs((updatedLink?.confidence ?? 0) - 0.9) < 0.001,
		`${label}: confidence must be ~0.9 after patch`
	);
	assert(
		updatedLink?.comment === `smoke update: ${RUN_ID}`,
		`${label}: comment must reflect patch`
	);

	// 7. Capture link UUID from DB before hard-delete (needed for audit verification).
	// The attach API returns only { ok: true } — no link ID in response.
	const linkId = await getLinkId(newsId, objectId);
	assert(typeof linkId === 'string', `${label}: could not find link row in DB before detach`);

	// 8. DELETE detach → { ok: true }
	const { response: detachResp, data: detachData } = await fetchJson(
		baseUrl,
		`/api/emis/news/${newsId}/objects/${objectId}`,
		{ method: 'DELETE', headers: makeWriteHeaders() }
	);
	assertOk(detachResp, `${label}: DELETE detach`);
	assert(detachData?.ok === true, `${label}: detach response must be { ok: true }`);
	linkDetached = true;

	// 9. GET news detail → relatedObjects no longer contains the link
	const { response: afterDetachResp, data: afterDetachData } = await fetchJson(
		baseUrl,
		`/api/emis/news/${newsId}`,
		{ headers: makeReadHeaders() }
	);
	assertOk(afterDetachResp, `${label}: GET news detail after detach`);
	const stillLinked = (afterDetachData?.relatedObjects ?? []).some((r) => r.id === objectId);
	assert(!stillLinked, `${label}: relatedObjects must not contain detached link`);

	// 10. Audit verification — entity_type='news_object_link', actions: attach / update / detach
	// link row is hard-deleted after detach; use linkId captured before step 8.
	const auditMeta = await assertAuditContract(
		'news_object_link',
		linkId,
		['attach', 'update', 'detach'],
		label
	);

	return { objectId, newsId, linkId, linkDetached, ...auditMeta };
}

// ---------------------------------------------------------------------------
// News flow
// ---------------------------------------------------------------------------

async function smokeNewsFlow(baseUrl, refs) {
	const label = 'news-flow';
	let deleted = false;

	// 1. POST /api/emis/news → 201
	const { response: createResp, data: created } = await fetchJson(baseUrl, '/api/emis/news', {
		method: 'POST',
		headers: makeWriteHeaders(),
		body: JSON.stringify(buildNewsPayload(RUN_ID, refs.sourceId))
	});
	assertStatus(createResp, 201, `${label}: POST create`);
	const newsId = created?.id;
	assert(typeof newsId === 'string', `${label}: create response must include id`);
	assert(
		created?.title === `EMIS WRITE SMOKE NEWS ${RUN_ID}`,
		`${label}: create response title must match`
	);

	addCleanup(`news ${newsId}`, async () => {
		if (deleted) return;
		await fetchJson(baseUrl, `/api/emis/news/${newsId}`, {
			method: 'DELETE',
			headers: makeWriteHeaders()
		});
	});

	// 2. GET /api/emis/news/:id → 200, fields match
	const { response: readResp, data: readData } = await fetchJson(
		baseUrl,
		`/api/emis/news/${newsId}`,
		{ headers: makeReadHeaders() }
	);
	assertOk(readResp, `${label}: GET detail`);
	assert(readData?.id === newsId, `${label}: detail id must match`);
	assert(
		readData?.title === `EMIS WRITE SMOKE NEWS ${RUN_ID}`,
		`${label}: detail title must match`
	);
	assert(readData?.summary === `smoke:${RUN_ID}`, `${label}: detail summary must match`);
	assert(readData?.isManual === true, `${label}: detail isManual must be true`);
	assert(readData?.meta?.smokeRunId === RUN_ID, `${label}: detail meta.smokeRunId must match`);

	// 3. PATCH /api/emis/news/:id → 200
	const { response: patchResp, data: patched } = await fetchJson(
		baseUrl,
		`/api/emis/news/${newsId}`,
		{
			method: 'PATCH',
			headers: makeWriteHeaders(),
			body: JSON.stringify(buildNewsPatch(RUN_ID))
		}
	);
	assertOk(patchResp, `${label}: PATCH update`);
	assert(patched?.id === newsId, `${label}: patch response id must match`);

	// 4. GET detail after PATCH → summary reflects update
	const { response: updatedResp, data: updatedData } = await fetchJson(
		baseUrl,
		`/api/emis/news/${newsId}`,
		{ headers: makeReadHeaders() }
	);
	assertOk(updatedResp, `${label}: GET updated detail`);
	assert(
		updatedData?.summary === `smoke update: ${RUN_ID}`,
		`${label}: updated summary must match`
	);

	// 5. DELETE /api/emis/news/:id → 200 { ok: true }
	const { response: deleteResp, data: deleteData } = await fetchJson(
		baseUrl,
		`/api/emis/news/${newsId}`,
		{ method: 'DELETE', headers: makeWriteHeaders() }
	);
	assertOk(deleteResp, `${label}: DELETE`);
	assert(deleteData?.ok === true, `${label}: DELETE response must be { ok: true }`);
	deleted = true;

	// 6. GET detail after DELETE → 404
	const { response: ghostResp } = await fetchJson(baseUrl, `/api/emis/news/${newsId}`, {
		headers: makeReadHeaders()
	});
	assertStatus(ghostResp, 404, `${label}: deleted news GET must return 404`);

	// 7. Active list must not contain the deleted news item
	const searchPath = `/api/emis/news?q=${encodeURIComponent(`EMIS WRITE SMOKE NEWS ${RUN_ID}`)}&limit=10`;
	const { response: listResp, data: listData } = await fetchJson(baseUrl, searchPath, {
		headers: makeReadHeaders()
	});
	assertOk(listResp, `${label}: list search after delete`);
	const stillInList = (listData?.rows ?? []).some((r) => r.id === newsId);
	assert(!stillInList, `${label}: deleted news must not appear in active list`);

	// 8. Audit verification — entity_type='news_item', actions: create / update / delete
	const auditMeta = await assertAuditContract(
		'news_item',
		newsId,
		['create', 'update', 'delete'],
		label
	);

	return { newsId, deleted, ...auditMeta };
}

// ---------------------------------------------------------------------------
// Object flow
// ---------------------------------------------------------------------------

async function smokeObjectFlow(baseUrl, refs) {
	const label = 'object-flow';
	let deleted = false;

	// 1. POST /api/emis/objects → 201
	const { response: createResp, data: created } = await fetchJson(baseUrl, '/api/emis/objects', {
		method: 'POST',
		headers: makeWriteHeaders(),
		body: JSON.stringify(buildObjectPayload(RUN_ID, refs.objectTypeId))
	});
	assertStatus(createResp, 201, `${label}: POST create`);
	const objectId = created?.id;
	assert(typeof objectId === 'string', `${label}: create response must include id`);
	assert(
		created?.name === `EMIS WRITE SMOKE OBJECT ${RUN_ID}`,
		`${label}: create response name must match`
	);

	// Register cleanup right after getting the ID.
	// If DELETE in this flow succeeds, cleanup is a no-op (deleted=true).
	// If the flow fails midway, cleanup deletes the orphaned record.
	addCleanup(`object ${objectId}`, async () => {
		if (deleted) return;
		await fetchJson(baseUrl, `/api/emis/objects/${objectId}`, {
			method: 'DELETE',
			headers: makeWriteHeaders()
		});
	});

	// 2. GET /api/emis/objects/:id → 200, fields match
	const { response: readResp, data: readData } = await fetchJson(
		baseUrl,
		`/api/emis/objects/${objectId}`,
		{ headers: makeReadHeaders() }
	);
	assertOk(readResp, `${label}: GET detail`);
	assert(readData?.id === objectId, `${label}: detail id must match`);
	assert(
		readData?.name === `EMIS WRITE SMOKE OBJECT ${RUN_ID}`,
		`${label}: detail name must match`
	);
	assert(
		readData?.attributes?.smokeRunId === RUN_ID,
		`${label}: detail attributes.smokeRunId must match`
	);
	assert(readData?.sourceNote === `smoke:${RUN_ID}`, `${label}: detail sourceNote must match`);

	// 3. PATCH /api/emis/objects/:id → 200
	const { response: patchResp, data: patched } = await fetchJson(
		baseUrl,
		`/api/emis/objects/${objectId}`,
		{
			method: 'PATCH',
			headers: makeWriteHeaders(),
			body: JSON.stringify(buildObjectPatch(RUN_ID))
		}
	);
	assertOk(patchResp, `${label}: PATCH update`);
	assert(patched?.id === objectId, `${label}: patch response id must match`);

	// 4. GET detail after PATCH → fields reflect update
	const { response: updatedResp, data: updatedData } = await fetchJson(
		baseUrl,
		`/api/emis/objects/${objectId}`,
		{ headers: makeReadHeaders() }
	);
	assertOk(updatedResp, `${label}: GET updated detail`);
	assert(
		updatedData?.description === `smoke update: ${RUN_ID}`,
		`${label}: updated description must match`
	);
	assert(updatedData?.status === 'inactive', `${label}: updated status must be inactive`);

	// 5. DELETE /api/emis/objects/:id → 200 { ok: true }
	const { response: deleteResp, data: deleteData } = await fetchJson(
		baseUrl,
		`/api/emis/objects/${objectId}`,
		{ method: 'DELETE', headers: makeWriteHeaders() }
	);
	assertOk(deleteResp, `${label}: DELETE`);
	assert(deleteData?.ok === true, `${label}: DELETE response must be { ok: true }`);
	deleted = true;

	// 6. GET detail after DELETE → 404 (soft-delete: deleted_at IS NULL filter)
	const { response: ghostResp } = await fetchJson(baseUrl, `/api/emis/objects/${objectId}`, {
		headers: makeReadHeaders()
	});
	assertStatus(ghostResp, 404, `${label}: deleted object GET must return 404`);

	// 7. Active list must not contain the deleted object
	const searchPath = `/api/emis/objects?q=${encodeURIComponent(`EMIS WRITE SMOKE OBJECT ${RUN_ID}`)}&limit=10`;
	const { response: listResp, data: listData } = await fetchJson(baseUrl, searchPath, {
		headers: makeReadHeaders()
	});
	assertOk(listResp, `${label}: list search after delete`);
	const stillInList = (listData?.rows ?? []).some((r) => r.id === objectId);
	assert(!stillInList, `${label}: deleted object must not appear in active list`);

	// 8. Audit verification — entity_type='object', actions: create / update / delete
	const auditMeta = await assertAuditContract(
		'object',
		objectId,
		['create', 'update', 'delete'],
		label
	);

	return { objectId, deleted, ...auditMeta };
}

// ---------------------------------------------------------------------------
// Write-policy negative checks
//
// These verify that assertWriteContext() enforces the EMIS_WRITE_POLICY mode.
//
// In strict mode (EMIS_WRITE_POLICY=strict, set on the server):
//   - POST without actor header → 403 WRITE_NOT_ALLOWED
//
// In permissive mode (default):
//   - POST without actor header → 201 (auto-default actor, backward-compatible)
//
// The check adapts its assertions based on the detected server policy mode.
// To run a strict-mode negative test, start the server with
// EMIS_WRITE_POLICY=strict or pass the env var before the smoke script:
//
//   EMIS_WRITE_POLICY=strict pnpm emis:write-smoke
// ---------------------------------------------------------------------------

/**
 * Probes the server's write-policy mode by sending a POST without actor headers.
 * Returns the server's response status and body so the caller can assert expectations.
 */
async function probeWritePolicyMode(baseUrl, refs) {
	const noActorHeaders = {
		'content-type': 'application/json',
		accept: 'application/json'
		// deliberately no x-emis-actor-id or x-actor-id
	};

	const { response, data } = await fetchJson(baseUrl, '/api/emis/objects', {
		method: 'POST',
		headers: noActorHeaders,
		body: JSON.stringify(buildObjectPayload(RUN_ID + '-policy-probe', refs.objectTypeId))
	});

	return { response, data };
}

/**
 * Negative smoke: verifies write-policy enforcement for the current server mode.
 *
 * When EMIS_WRITE_POLICY=strict (set on the server):
 *   - Expects 403 with code WRITE_NOT_ALLOWED
 *   - No entity is created, no cleanup needed
 *
 * When EMIS_WRITE_POLICY is unset or permissive (default):
 *   - Expects 201 (auto-default actor, backward-compatible)
 *   - Cleans up the created entity
 */
async function smokeWritePolicyCheck(baseUrl, refs) {
	const label = 'write-policy';
	const policyMode = process.env.EMIS_WRITE_POLICY ?? 'permissive';
	const isStrict = policyMode === 'strict';

	const { response, data } = await probeWritePolicyMode(baseUrl, refs);

	if (isStrict) {
		// Strict mode: server must reject with 403 WRITE_NOT_ALLOWED
		assertStatus(response, 403, `${label}: strict mode must reject write without actor`);
		assert(
			data?.code === 'WRITE_NOT_ALLOWED',
			`${label}: strict response code must be 'WRITE_NOT_ALLOWED', got '${data?.code}'`
		);
		assert(
			typeof data?.error === 'string' && data.error.length > 0,
			`${label}: strict response must include error message`
		);
		return { mode: 'strict', status: 403, code: data.code };
	}

	// Permissive mode: server must accept with 201 (auto-default actor)
	assertStatus(response, 201, `${label}: permissive mode must accept write without actor`);
	const objectId = data?.id;
	assert(typeof objectId === 'string', `${label}: permissive create must return id`);

	// Clean up probe entity
	addCleanup(`write-policy probe object ${objectId}`, async () => {
		await fetchJson(baseUrl, `/api/emis/objects/${objectId}`, {
			method: 'DELETE',
			headers: makeWriteHeaders()
		});
	});

	return { mode: 'permissive', status: 201, objectId };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

function buildChecks(baseUrl, refs) {
	return [
		{
			name: 'db:connectivity',
			run: async () => checkDbConnectivity()
		},
		{
			name: 'api:health',
			run: async () => checkHealth(baseUrl)
		},
		{
			name: 'smoke:refs',
			run: async () => {
				// Validate that payload builders produce the expected shapes.
				// refs were already loaded by runChecks — this check just asserts them.
				const objPayload = buildObjectPayload(RUN_ID, refs.objectTypeId);
				const newsPayload = buildNewsPayload(RUN_ID, refs.sourceId);
				assert(objPayload.name.includes(RUN_ID), 'object payload must carry runId in name');
				assert(
					objPayload.attributes.smokeRunId === RUN_ID,
					'object payload must carry smokeRunId in attributes'
				);
				assert(newsPayload.title.includes(RUN_ID), 'news payload must carry runId in title');
				assert(
					newsPayload.meta.smokeRunId === RUN_ID,
					'news payload must carry smokeRunId in meta'
				);
				return {
					objectTypeId: refs.objectTypeId,
					sourceId: refs.sourceId,
					sampleObjectName: objPayload.name,
					sampleNewsTitle: newsPayload.title
				};
			}
		},
		{
			name: 'object-flow',
			run: async () => smokeObjectFlow(baseUrl, refs)
		},
		{
			name: 'news-flow',
			run: async () => smokeNewsFlow(baseUrl, refs)
		},
		{
			name: 'link-flow',
			run: async () => smokeLinkFlow(baseUrl, refs)
		},
		{
			name: 'write-policy',
			run: async () => smokeWritePolicyCheck(baseUrl, refs)
		}
	];
}

async function runChecks(baseUrl) {
	const startedAt = Date.now();
	const results = [];

	// Load FK refs before any write checks — fail fast if DB is not seeded.
	let refs = null;
	{
		const t = Date.now();
		try {
			refs = await loadSmokeRefs(baseUrl);
		} catch (error) {
			results.push({
				name: 'smoke:refs:load',
				ok: false,
				durationMs: Date.now() - t,
				error: error instanceof Error ? error.message : String(error)
			});
			console.log('FAIL  smoke:refs:load');
			if (error instanceof Error) console.error(`      ${error.message}`);
			// Can't continue without refs — return early
			return {
				runId: RUN_ID,
				actor: ACTOR_ID,
				startedAt: new Date(startedAt).toISOString(),
				finishedAt: new Date().toISOString(),
				durationMs: Date.now() - startedAt,
				ok: false,
				results
			};
		}
	}

	for (const check of buildChecks(baseUrl, refs)) {
		const t = Date.now();
		try {
			const meta = await check.run();
			const durationMs = Date.now() - t;
			results.push({ name: check.name, ok: true, durationMs, ...meta });
			console.log(`PASS  ${check.name}  (${durationMs}ms)`);
		} catch (error) {
			const durationMs = Date.now() - t;
			results.push({
				name: check.name,
				ok: false,
				durationMs,
				error: error instanceof Error ? error.message : String(error)
			});
			console.log(`FAIL  ${check.name}  (${durationMs}ms)`);
			if (error instanceof Error) console.error(`      ${error.message}`);
		}
	}

	const passed = results.filter((r) => r.ok).length;
	const failed = results.length - passed;

	return {
		runId: RUN_ID,
		actor: ACTOR_ID,
		summary: { passed, failed, total: results.length },
		startedAt: new Date(startedAt).toISOString(),
		finishedAt: new Date().toISOString(),
		durationMs: Date.now() - startedAt,
		ok: failed === 0,
		results
	};
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main() {
	if (process.argv.includes('--help') || process.argv.includes('-h')) {
		console.log('Usage:');
		console.log('  pnpm emis:write-smoke');
		console.log('  pnpm emis:write-smoke -- --base-url http://127.0.0.1:5173');
		console.log('');
		console.log('Env:');
		console.log('  DATABASE_URL  — required for audit_log verification');
		return;
	}

	const externalUrl = readOption('--base-url');
	let server = null;

	console.log(`[emis:write-smoke] runId=${RUN_ID}  actor=${ACTOR_ID}`);

	try {
		if (externalUrl) {
			console.log(`[emis:write-smoke] using external server ${externalUrl}`);
		} else {
			console.log('[emis:write-smoke] starting local Vite dev server...');
			server = await startLocalServer();
			console.log(`[emis:write-smoke] server ready at ${server.baseUrl}`);
		}

		const baseUrl = externalUrl ?? server?.baseUrl ?? '';
		const report = await runChecks(baseUrl);

		const { passed, failed, total } = report.summary;
		console.log(
			`\n${report.ok ? 'OK' : 'FAIL'}  ${passed}/${total} passed  (${report.durationMs}ms)`
		);
		console.log(JSON.stringify(report, null, 2));

		if (!report.ok) {
			if (server) {
				const logs = server.getLogs();
				console.error('[emis:write-smoke] recent dev server stdout:');
				for (const line of logs.stdout.slice(-20)) console.error(line);
				if (logs.stderr.length) {
					console.error('[emis:write-smoke] recent dev server stderr:');
					for (const line of logs.stderr.slice(-20)) console.error(line);
				}
			}
			process.exitCode = 1;
		}
	} finally {
		await runCleanup();
		await closePool();
		if (server) await server.stop();
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	if (error?.serverLogs) console.error(JSON.stringify(error.serverLogs, null, 2));
	process.exit(1);
});
