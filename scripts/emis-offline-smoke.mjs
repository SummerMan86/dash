/**
 * emis-offline-smoke.mjs
 *
 * Headless smoke for EMIS offline basemap infrastructure.
 * Verifies:
 *   1. Asset inventory   — manifest.json, .pmtiles, sprites/, fonts/ present on disk
 *   2. Manifest validity — version field, pmtiles array, each referenced file exists
 *   3. Bundle readiness  — all components ready (runtimeStatus would not be "missing-assets")
 *   4. Range request     — static PMTiles served via dev server → 206 Partial Content
 *   5. Spike page load   — /emis/pmtiles-spike returns 200 (offline flow reachable)
 *
 * Usage:
 *   pnpm emis:offline-smoke
 *   pnpm emis:offline-smoke -- --base-url http://127.0.0.1:5173
 *
 * No DATABASE_URL needed — all checks are filesystem or HTTP only.
 *
 * Env caveats:
 *   CHOKIDAR_USEPOLLING=1  required on shared folder / Docker mounts (same as emis:smoke)
 */

import 'dotenv/config';

import { access, readdir, readFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OFFLINE_ASSET_DIR = path.resolve(process.cwd(), 'static', 'emis-map', 'offline');
const DEFAULT_HOST = '127.0.0.1';
const STARTUP_TIMEOUT_MS = 30_000;
const REQUEST_TIMEOUT_MS = 15_000;
const LOG_BUFFER_LIMIT = 120;

// ---------------------------------------------------------------------------
// FS helpers — replicate pmtilesBundle.ts logic without TypeScript imports
// ---------------------------------------------------------------------------

async function pathExists(targetPath) {
	try {
		await access(targetPath);
		return true;
	} catch {
		return false;
	}
}

async function hasVisibleEntries(targetPath) {
	try {
		const entries = await readdir(targetPath);
		return entries.some((entry) => !entry.startsWith('.'));
	} catch {
		return false;
	}
}

async function readManifest() {
	const manifestPath = path.join(OFFLINE_ASSET_DIR, 'manifest.json');
	if (!(await pathExists(manifestPath))) return null;
	try {
		return JSON.parse(await readFile(manifestPath, 'utf8'));
	} catch {
		return null;
	}
}

function parsePmtilesEntries(rawPmtiles) {
	if (!Array.isArray(rawPmtiles)) return [];
	return rawPmtiles
		.map((item) => {
			if (typeof item === 'string') return item;
			if (item && typeof item === 'object' && typeof item.file === 'string') return item.file;
			return null;
		})
		.filter(Boolean);
}

// ---------------------------------------------------------------------------
// Server lifecycle — shared pattern with emis-smoke.mjs
// ---------------------------------------------------------------------------

function pushLog(buffer, chunk) {
	const text = chunk.toString().trim();
	if (!text) return;
	for (const line of text.split(/\r?\n/)) {
		if (!line.trim()) continue;
		buffer.push(line);
		if (buffer.length > LOG_BUFFER_LIMIT) buffer.shift();
	}
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

async function startLocalServer() {
	const port = await getFreePort();
	const baseUrl = `http://${DEFAULT_HOST}:${port}`;
	const stdout = [];
	const stderr = [];
	const child = spawn(
		'pnpm',
		['exec', 'vite', 'dev', '--host', DEFAULT_HOST, '--port', String(port), '--strictPort'],
		{ stdio: ['ignore', 'pipe', 'pipe'], env: process.env, cwd: process.cwd() }
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
	]).finally(() => clearTimeout(timer));
}

async function fetchRangeRequest(url, signal) {
	const response = await fetch(url, {
		method: 'GET',
		headers: { Range: 'bytes=0-9' },
		signal
	});
	const body = new Uint8Array(await response.arrayBuffer());
	return {
		status: response.status,
		contentRange: response.headers.get('content-range'),
		acceptRanges: response.headers.get('accept-ranges'),
		bodyLength: body.byteLength
	};
}

// ---------------------------------------------------------------------------
// Check helpers
// ---------------------------------------------------------------------------

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

const checks = [
	// --- 1. Asset inventory (filesystem, no server needed) ---

	{
		kind: 'fs',
		name: 'assets:manifest-file',
		run: async () => {
			const manifestPath = path.join(OFFLINE_ASSET_DIR, 'manifest.json');
			assert(await pathExists(manifestPath), `manifest.json not found at ${manifestPath}`);
			return { path: manifestPath };
		}
	},
	{
		kind: 'fs',
		name: 'assets:pmtiles',
		run: async () => {
			const entries = await readdir(OFFLINE_ASSET_DIR).catch(() => []);
			const pmtilesFiles = entries.filter((name) => name.toLowerCase().endsWith('.pmtiles'));
			assert(pmtilesFiles.length > 0, `No .pmtiles files found in ${OFFLINE_ASSET_DIR}`);
			return { files: pmtilesFiles };
		}
	},
	{
		kind: 'fs',
		name: 'assets:sprites',
		run: async () => {
			const spritesDir = path.join(OFFLINE_ASSET_DIR, 'sprites');
			assert(
				await hasVisibleEntries(spritesDir),
				`sprites/ dir is missing or empty at ${spritesDir}`
			);
			return { path: spritesDir };
		}
	},
	{
		kind: 'fs',
		name: 'assets:fonts',
		run: async () => {
			const fontsDir = path.join(OFFLINE_ASSET_DIR, 'fonts');
			assert(await hasVisibleEntries(fontsDir), `fonts/ dir is missing or empty at ${fontsDir}`);
			return { path: fontsDir };
		}
	},

	// --- 2. Manifest validation (filesystem) ---

	{
		kind: 'fs',
		name: 'manifest:valid',
		run: async () => {
			const manifest = await readManifest();
			assert(manifest !== null, 'manifest.json could not be read or parsed');
			assert(
				typeof manifest.version === 'number',
				`manifest.version must be a number, got ${JSON.stringify(manifest.version)}`
			);
			const entries = parsePmtilesEntries(manifest.pmtiles);
			assert(entries.length > 0, 'manifest.pmtiles must contain at least one file entry');
			return { version: manifest.version, pmtilesCount: entries.length };
		}
	},
	{
		kind: 'fs',
		name: 'manifest:files',
		run: async () => {
			const manifest = await readManifest();
			assert(manifest !== null, 'manifest.json not readable');
			const entries = parsePmtilesEntries(manifest.pmtiles);
			assert(entries.length > 0, 'manifest.pmtiles is empty');
			const missing = [];
			for (const filename of entries) {
				const filePath = path.join(OFFLINE_ASSET_DIR, filename);
				if (!(await pathExists(filePath))) missing.push(filename);
			}
			assert(missing.length === 0, `manifest references missing files: ${missing.join(', ')}`);
			return { verified: entries };
		}
	},

	// --- 3. Bundle readiness (filesystem derived summary) ---

	{
		kind: 'fs',
		name: 'bundle:ready',
		run: async () => {
			const manifest = await readManifest();
			const manifestParsed = manifest !== null;
			const manifestReady = await pathExists(path.join(OFFLINE_ASSET_DIR, 'manifest.json'));
			const spritesReady = await hasVisibleEntries(path.join(OFFLINE_ASSET_DIR, 'sprites'));
			const fontsReady = await hasVisibleEntries(path.join(OFFLINE_ASSET_DIR, 'fonts'));
			const pmtilesFiles = (await readdir(OFFLINE_ASSET_DIR).catch(() => [])).filter((name) =>
				name.toLowerCase().endsWith('.pmtiles')
			);
			const pmtilesReady = pmtilesFiles.length > 0;

			const missing = [];
			if (!pmtilesReady) missing.push('pmtiles');
			if (!spritesReady) missing.push('sprites');
			if (!fontsReady) missing.push('fonts');
			if (!manifestReady || !manifestParsed) missing.push('manifest');

			assert(
				missing.length === 0,
				`Bundle not ready — missing components: ${missing.join(', ')}. ` +
					`runtimeStatus would be "missing-assets".`
			);
			return {
				pmtiles: pmtilesFiles,
				sprites: spritesReady,
				fonts: fontsReady,
				manifest: manifestReady && manifestParsed
			};
		}
	},

	// --- 4 + 5. HTTP checks (dev server required) ---

	{
		kind: 'http',
		name: 'http:spike-page',
		run: async (baseUrl) => {
			await withTimeout(
				async (signal) => {
					const response = await fetch(`${baseUrl}/emis/pmtiles-spike`, {
						method: 'GET',
						signal
					});
					assert(response.ok, `/emis/pmtiles-spike returned ${response.status} (expected 200)`);
				},
				REQUEST_TIMEOUT_MS,
				'GET /emis/pmtiles-spike'
			);
			return {};
		}
	},
	{
		kind: 'http',
		name: 'http:range:pmtiles',
		run: async (baseUrl) => {
			const manifest = await readManifest();
			const entries = manifest ? parsePmtilesEntries(manifest.pmtiles) : [];
			const filename = entries[0] ?? null;
			assert(filename !== null, 'No pmtiles file entry in manifest — cannot determine probe URL');

			const url = `${baseUrl}/emis-map/offline/${filename}`;
			const result = await withTimeout(
				(signal) => fetchRangeRequest(url, signal),
				REQUEST_TIMEOUT_MS,
				`Range GET ${url}`
			);

			assert(
				result.status === 206,
				`Expected 206 Partial Content, got ${result.status} (URL: ${url}). ` +
					`Static file server may not support Range requests.`
			);
			assert(
				result.acceptRanges === 'bytes',
				`Expected Accept-Ranges: bytes, got ${result.acceptRanges ?? 'missing'}`
			);
			assert(
				result.contentRange?.startsWith('bytes 0-9/'),
				`Unexpected Content-Range: ${result.contentRange ?? 'missing'}`
			);
			assert(result.bodyLength === 10, `Expected 10 bytes, got ${result.bodyLength}`);

			return { url, status: result.status, acceptRanges: result.acceptRanges };
		}
	}
];

// ---------------------------------------------------------------------------
// Runner + report
// ---------------------------------------------------------------------------

async function runChecks(baseUrl) {
	const startedAt = Date.now();
	const results = [];

	for (const check of checks) {
		const checkStartedAt = Date.now();
		try {
			const meta = await check.run(baseUrl);
			const durationMs = Date.now() - checkStartedAt;
			results.push({ name: check.name, kind: check.kind, ok: true, durationMs, ...meta });
			console.log(`PASS  ${check.name}  (${durationMs}ms)`);
		} catch (error) {
			const durationMs = Date.now() - checkStartedAt;
			const message = error instanceof Error ? error.message : String(error);
			results.push({
				name: check.name,
				kind: check.kind,
				ok: false,
				durationMs,
				error: message
			});
			console.log(`FAIL  ${check.name}  (${durationMs}ms)`);
			console.log(`      ${message}`);
		}
	}

	const passed = results.filter((r) => r.ok).length;
	const failed = results.filter((r) => !r.ok).length;
	const totalMs = Date.now() - startedAt;

	return {
		startedAt: new Date(startedAt).toISOString(),
		finishedAt: new Date().toISOString(),
		durationMs: totalMs,
		ok: failed === 0,
		summary: { passed, failed, total: results.length },
		results
	};
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function readOption(name) {
	const index = process.argv.findIndex((arg) => arg === name);
	if (index === -1) return null;
	return process.argv[index + 1] ?? null;
}

function printUsage() {
	console.log('Usage:');
	console.log('  pnpm emis:offline-smoke');
	console.log('  pnpm emis:offline-smoke -- --base-url http://127.0.0.1:5173');
	console.log();
	console.log('Env caveats:');
	console.log(
		'  CHOKIDAR_USEPOLLING=1  required on shared folder / Docker mounts (prevents EMFILE)'
	);
}

async function main() {
	if (process.argv.includes('--help') || process.argv.includes('-h')) {
		printUsage();
		return;
	}

	const externalBaseUrl = readOption('--base-url');
	let server = null;

	try {
		if (externalBaseUrl) {
			console.log(`[emis:offline-smoke] using external server ${externalBaseUrl}`);
		} else {
			console.log('[emis:offline-smoke] starting local Vite dev server...');
			server = await startLocalServer();
			console.log(`[emis:offline-smoke] server ready at ${server.baseUrl}`);
		}

		const baseUrl = externalBaseUrl ?? server.baseUrl;
		const report = await runChecks(baseUrl);

		const { passed, failed, total } = report.summary;
		console.log();
		console.log(
			`${report.ok ? 'OK' : 'FAIL'}  ${passed}/${total} passed  (${report.durationMs}ms)`
		);
		console.log();
		console.log(JSON.stringify(report, null, 2));

		if (!report.ok) {
			if (server) {
				const logs = server.getLogs();
				console.error('[emis:offline-smoke] recent dev server stdout:');
				for (const line of logs.stdout.slice(-20)) console.error(line);
				if (logs.stderr.length) {
					console.error('[emis:offline-smoke] recent dev server stderr:');
					for (const line of logs.stderr.slice(-20)) console.error(line);
				}
			}
			process.exitCode = 1;
		}
	} finally {
		if (server) await server.stop();
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	if (error?.serverLogs) {
		console.error(JSON.stringify(error.serverLogs, null, 2));
	}
	process.exit(1);
});
