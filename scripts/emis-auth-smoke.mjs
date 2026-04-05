/**
 * emis-auth-smoke.mjs
 *
 * Auth-flow smoke for EMIS: exercises session-based authentication flows
 * in EMIS_AUTH_MODE=session.
 *
 * Tests:
 *   1. Login with valid credentials   -> 303 redirect + session cookie set
 *   2. Login with invalid credentials -> re-render login (no redirect, form error)
 *   3. Access protected API without session -> 401
 *   4. Access admin API as non-admin (editor) -> 403
 *   5. Access protected API with session -> 200
 *   6. Change password flow (valid + invalid)
 *
 * Requirements:
 *   - DATABASE_URL pointing to a Postgres with emis.users table
 *   - At least one admin user in DB (or EMIS_ADMIN_PASSWORD set for auto-seed)
 *   - The script creates temporary test users and cleans them up after
 *
 * Usage:
 *   pnpm emis:auth-smoke
 *   pnpm emis:auth-smoke -- --base-url http://127.0.0.1:5173
 *
 * Env:
 *   DATABASE_URL       - required (same as app uses)
 *   EMIS_AUTH_MODE     - forced to 'session' by this script
 *   EMIS_ADMIN_PASSWORD - if no DB admin exists, script will set this for auto-seed
 */

import 'dotenv/config';

// Force session mode for auth smoke
process.env.EMIS_AUTH_MODE = 'session';

import net from 'node:net';
import { spawn } from 'node:child_process';

import pg from 'pg';

const { Pool } = pg;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_HOST = '127.0.0.1';
const STARTUP_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 15_000;
const APP_DIR = new URL('../apps/web', import.meta.url).pathname;
const RUN_ID = Date.now().toString(36);

// Test users created by this smoke run
const ADMIN_USER = {
	username: `smoke-admin-${RUN_ID}`,
	password: `SmokeAdmin!${RUN_ID}`,
	role: 'admin'
};
const EDITOR_USER = {
	username: `smoke-editor-${RUN_ID}`,
	password: `SmokeEditor!${RUN_ID}`,
	role: 'editor'
};

// ---------------------------------------------------------------------------
// DB access (for test user setup/cleanup)
// ---------------------------------------------------------------------------

let _pool = null;

function getPool() {
	const url = process.env.DATABASE_URL?.trim();
	if (!url) {
		throw new Error(
			'DATABASE_URL is required for auth-smoke.\n' +
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
// Test user management via DB + bcrypt
//
// We create test users directly in the DB with bcrypt hashes. This avoids
// depending on the admin API (which is what we're testing).
// ---------------------------------------------------------------------------

async function hashPassword(password) {
	// Use the same bcrypt lib as the app
	const bcrypt = await import('bcrypt');
	const rounds = parseInt(process.env.EMIS_BCRYPT_ROUNDS ?? '12', 10);
	return bcrypt.default.hash(password, rounds);
}

const createdUserIds = [];

async function createTestUser(user) {
	const hash = await hashPassword(user.password);
	const result = await dbQuery(
		`INSERT INTO emis.users (username, password_hash, role)
		 VALUES ($1, $2, $3)
		 RETURNING id`,
		[user.username, hash, user.role]
	);
	const id = result.rows[0].id;
	createdUserIds.push(id);
	return id;
}

async function cleanupTestUsers() {
	if (createdUserIds.length === 0) return;
	console.log(`[emis:auth-smoke] cleaning up ${createdUserIds.length} test user(s)...`);
	for (const id of createdUserIds) {
		try {
			// Delete sessions first (FK constraint)
			await dbQuery('DELETE FROM emis.sessions WHERE user_id = $1', [id]);
			await dbQuery('DELETE FROM emis.users WHERE id = $1', [id]);
		} catch (err) {
			console.warn(`  cleanup warning for user ${id}: ${err.message}`);
		}
	}
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

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

/**
 * Perform a login via the /emis/login form action.
 * Returns { response, cookies } where cookies is a Map of cookie name -> value.
 * We use redirect: 'manual' to capture the 303 redirect and Set-Cookie header.
 */
async function doLogin(baseUrl, username, password, signal) {
	const formBody = new URLSearchParams({ username, password });
	const response = await fetch(`${baseUrl}/emis/login`, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: formBody.toString(),
		redirect: 'manual',
		signal
	});

	const cookies = new Map();
	const setCookieHeaders = response.headers.getSetCookie?.() ?? [];
	for (const header of setCookieHeaders) {
		const [pair] = header.split(';');
		const [name, ...valueParts] = pair.split('=');
		cookies.set(name.trim(), valueParts.join('=').trim());
	}

	return { response, cookies };
}

/**
 * Fetch JSON with optional session cookie.
 */
async function fetchJson(baseUrl, path, options = {}) {
	return await withTimeout(
		async (signal) => {
			const headers = { accept: 'application/json', ...(options.headers ?? {}) };
			if (options.sessionCookie) {
				headers.cookie = `emis_session=${options.sessionCookie}`;
			}
			const response = await fetch(`${baseUrl}${path}`, {
				...options,
				headers,
				signal,
				redirect: options.redirect ?? 'follow'
			});
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

// ---------------------------------------------------------------------------
// Server management (same pattern as emis-smoke.mjs)
// ---------------------------------------------------------------------------

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

const LOG_BUFFER_LIMIT = 120;

function pushLog(buffer, chunk) {
	const text = chunk.toString().trim();
	if (!text) return;
	for (const line of text.split(/\r?\n/)) {
		if (!line.trim()) continue;
		buffer.push(line);
		if (buffer.length > LOG_BUFFER_LIMIT) buffer.shift();
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
			cwd: APP_DIR
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

function readOption(name) {
	const index = process.argv.findIndex((arg) => arg === name);
	if (index === -1) return null;
	return process.argv[index + 1] ?? null;
}

// ---------------------------------------------------------------------------
// Auth smoke checks
// ---------------------------------------------------------------------------

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

const checks = [
	// 1. Login with valid admin credentials -> 303 redirect + session cookie
	{
		name: 'auth:login:valid-admin',
		kind: 'auth',
		run: async (baseUrl, ctx) => {
			const { response, cookies } = await withTimeout(
				async (signal) => doLogin(baseUrl, ADMIN_USER.username, ADMIN_USER.password, signal),
				REQUEST_TIMEOUT_MS,
				'login valid admin'
			);
			// SvelteKit form actions redirect on success with 303
			assert(
				response.status === 303 || response.status === 302,
				`expected 302/303 redirect, got ${response.status}`
			);
			const sessionCookie = cookies.get('emis_session');
			assert(
				sessionCookie && sessionCookie.length > 0,
				'emis_session cookie must be set after successful login'
			);
			ctx.adminSession = sessionCookie;
			return { status: response.status, hasSession: true };
		}
	},

	// 2. Login with invalid credentials -> no redirect (re-render with error)
	{
		name: 'auth:login:invalid-credentials',
		kind: 'auth',
		run: async (baseUrl) => {
			const { response, cookies } = await withTimeout(
				async (signal) => doLogin(baseUrl, 'nonexistent-user', 'wrong-password', signal),
				REQUEST_TIMEOUT_MS,
				'login invalid'
			);
			// SvelteKit form actions return 400/401 on failure (re-render with error)
			assert(
				response.status === 200 || response.status === 400 || response.status === 401,
				`expected 200/400/401 for failed login, got ${response.status}`
			);
			const sessionCookie = cookies.get('emis_session');
			assert(!sessionCookie, 'emis_session cookie must NOT be set after failed login');
			return { status: response.status, hasSession: false };
		}
	},

	// 3. Access protected API without session -> 401
	{
		name: 'auth:api:no-session-401',
		kind: 'auth',
		run: async (baseUrl) => {
			const { response, data } = await fetchJson(baseUrl, '/api/emis/objects?limit=1');
			assert(response.status === 401, `expected 401, got ${response.status}`);
			assert(data?.code === 'UNAUTHORIZED', `expected code UNAUTHORIZED, got ${data?.code}`);
			return { status: response.status, code: data.code };
		}
	},

	// 4. Login as editor
	{
		name: 'auth:login:valid-editor',
		kind: 'auth',
		run: async (baseUrl, ctx) => {
			const { response, cookies } = await withTimeout(
				async (signal) => doLogin(baseUrl, EDITOR_USER.username, EDITOR_USER.password, signal),
				REQUEST_TIMEOUT_MS,
				'login valid editor'
			);
			assert(
				response.status === 303 || response.status === 302,
				`expected 302/303, got ${response.status}`
			);
			const sessionCookie = cookies.get('emis_session');
			assert(sessionCookie && sessionCookie.length > 0, 'editor session cookie must be set');
			ctx.editorSession = sessionCookie;
			return { status: response.status, hasSession: true };
		}
	},

	// 5. Access admin API as editor -> 403
	{
		name: 'auth:api:editor-admin-403',
		kind: 'auth',
		run: async (baseUrl, ctx) => {
			assert(ctx.editorSession, 'prerequisite: editor session not available');
			const { response, data } = await fetchJson(baseUrl, '/api/emis/admin/users', {
				sessionCookie: ctx.editorSession
			});
			assert(response.status === 403, `expected 403, got ${response.status}`);
			assert(data?.code === 'FORBIDDEN', `expected code FORBIDDEN, got ${data?.code}`);
			return { status: response.status, code: data.code };
		}
	},

	// 6. Access admin API as admin -> 200
	{
		name: 'auth:api:admin-access-200',
		kind: 'auth',
		run: async (baseUrl, ctx) => {
			assert(ctx.adminSession, 'prerequisite: admin session not available');
			const { response, data } = await fetchJson(baseUrl, '/api/emis/admin/users', {
				sessionCookie: ctx.adminSession
			});
			assert(
				response.status === 200 || response.status === 503,
				`expected 200 or 503, got ${response.status}`
			);
			if (response.status === 200) {
				assert(Array.isArray(data?.rows), 'admin users response must have rows array');
			}
			return { status: response.status };
		}
	},

	// 7. Access protected API with valid session -> 200
	{
		name: 'auth:api:with-session-200',
		kind: 'auth',
		run: async (baseUrl, ctx) => {
			assert(ctx.adminSession, 'prerequisite: admin session not available');
			const { response, data } = await fetchJson(baseUrl, '/api/emis/objects?limit=1', {
				sessionCookie: ctx.adminSession
			});
			assert(response.status === 200, `expected 200, got ${response.status}`);
			assert(Array.isArray(data?.rows), 'objects response must have rows array');
			return { status: response.status };
		}
	},

	// 8. Change password with wrong current password -> 403
	{
		name: 'auth:change-password:wrong-current',
		kind: 'auth',
		run: async (baseUrl, ctx) => {
			assert(ctx.editorSession, 'prerequisite: editor session not available');
			const { response, data } = await fetchJson(baseUrl, '/api/emis/auth/change-password', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					currentPassword: 'totally-wrong-password',
					newPassword: 'NewPassword123!'
				}),
				sessionCookie: ctx.editorSession
			});
			assert(response.status === 403, `expected 403, got ${response.status}`);
			assert(
				data?.code === 'INVALID_PASSWORD',
				`expected code INVALID_PASSWORD, got ${data?.code}`
			);
			return { status: response.status, code: data.code };
		}
	},

	// 9. Change password with valid credentials -> 200
	{
		name: 'auth:change-password:valid',
		kind: 'auth',
		run: async (baseUrl, ctx) => {
			assert(ctx.editorSession, 'prerequisite: editor session not available');
			const newPassword = `NewEditorPass!${RUN_ID}`;
			const { response, data } = await fetchJson(baseUrl, '/api/emis/auth/change-password', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					currentPassword: EDITOR_USER.password,
					newPassword
				}),
				sessionCookie: ctx.editorSession
			});
			assert(response.status === 200, `expected 200, got ${response.status}`);
			assert(data?.ok === true, 'change-password response must have ok: true');

			// Verify login with new password works
			const { response: loginResp, cookies } = await withTimeout(
				async (signal) => doLogin(baseUrl, EDITOR_USER.username, newPassword, signal),
				REQUEST_TIMEOUT_MS,
				'login after password change'
			);
			assert(
				loginResp.status === 303 || loginResp.status === 302,
				`login after password change: expected 302/303, got ${loginResp.status}`
			);
			const newSession = cookies.get('emis_session');
			assert(newSession, 'new session cookie must be set after login with changed password');

			return { status: response.status, loginAfterChangeOk: true };
		}
	},

	// 10. EMIS page route without session -> redirect to login
	{
		name: 'auth:page:redirect-to-login',
		kind: 'auth',
		run: async (baseUrl) => {
			const { response } = await withTimeout(
				async (signal) =>
					fetch(`${baseUrl}/emis`, {
						signal,
						redirect: 'manual'
					}),
				REQUEST_TIMEOUT_MS,
				'page redirect check'
			);
			assert(
				response.status === 303 || response.status === 302,
				`expected 302/303 redirect to login, got ${response.status}`
			);
			const location = response.headers.get('location');
			assert(
				location && location.includes('/emis/login'),
				`expected redirect to /emis/login, got location: ${location}`
			);
			return { status: response.status, location };
		}
	}
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function runChecks(baseUrl) {
	const startedAt = Date.now();
	const results = [];
	const ctx = {};

	for (const check of checks) {
		const checkStartedAt = Date.now();
		try {
			const meta = await check.run(baseUrl, ctx);
			results.push({
				name: check.name,
				kind: check.kind,
				ok: true,
				durationMs: Date.now() - checkStartedAt,
				...meta
			});
			console.log(`PASS ${check.name}`);
		} catch (error) {
			results.push({
				name: check.name,
				kind: check.kind,
				ok: false,
				durationMs: Date.now() - checkStartedAt,
				error: error instanceof Error ? error.message : String(error)
			});
			console.log(
				`FAIL ${check.name} -- ${error instanceof Error ? error.message : String(error)}`
			);
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	const baseUrl = readOption('--base-url');
	if (process.argv.includes('--help') || process.argv.includes('-h')) {
		console.log('Usage:');
		console.log('  pnpm emis:auth-smoke');
		console.log('  pnpm emis:auth-smoke -- --base-url http://127.0.0.1:5173');
		return;
	}

	let server = null;

	try {
		// --- Create test users in DB ---
		console.log(`[emis:auth-smoke] run=${RUN_ID} creating test users...`);
		await createTestUser(ADMIN_USER);
		await createTestUser(EDITOR_USER);
		console.log(
			`[emis:auth-smoke] test users created: ${ADMIN_USER.username}, ${EDITOR_USER.username}`
		);

		if (baseUrl) {
			console.log(`[emis:auth-smoke] using external server ${baseUrl}`);
		} else {
			console.log('[emis:auth-smoke] starting local Vite dev server (EMIS_AUTH_MODE=session)');
			server = await startLocalServer();
			console.log(`[emis:auth-smoke] server ready at ${server.baseUrl}`);
		}

		const report = await runChecks(baseUrl ?? server.baseUrl);
		console.log(JSON.stringify(report, null, 2));

		if (!report.ok) {
			if (server) {
				const logs = server.getLogs();
				console.error('[emis:auth-smoke] recent dev server stdout:');
				for (const line of logs.stdout.slice(-20)) console.error(line);
				if (logs.stderr.length) {
					console.error('[emis:auth-smoke] recent dev server stderr:');
					for (const line of logs.stderr.slice(-20)) console.error(line);
				}
			}
			process.exitCode = 1;
		}
	} finally {
		// --- Cleanup ---
		await cleanupTestUsers();
		await closePool();
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
	// Attempt cleanup even on crash
	cleanupTestUsers()
		.then(() => closePool())
		.catch(() => {})
		.finally(() => process.exit(1));
});
