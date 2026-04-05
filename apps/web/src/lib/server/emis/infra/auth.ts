/**
 * EMIS Session-Based Auth Module.
 *
 * Provides cookie-based session authentication for EMIS routes.
 * Controlled by `EMIS_AUTH_MODE` env var:
 *   - 'session' (default since AUTH-7): cookie-based sessions, login required for protected routes
 *   - 'none': no auth, for dev/smoke (explicit opt-out via EMIS_AUTH_MODE=none)
 *
 * User store (AUTH-3):
 *   - Primary: DB table `emis.users` via emis-server user repository + bcrypt
 *   - Fallback: `EMIS_USERS` env var (plaintext passwords, transition period)
 *
 * Session store (AUTH-4):
 *   - Primary: DB table `emis.sessions` via emis-server session repository
 *   - Fallback: in-memory Map if DB is unreachable (graceful degradation)
 *   - Sessions survive server restart when DB is available
 *
 * Canonical contract: docs/emis_access_model.md section 5.
 *
 * No SQL in this file. DB queries delegated to emis-server repositories.
 */

import { randomUUID } from 'node:crypto';

import * as sessionRepo from '@dashboard-builder/emis-server/modules/sessions/repository';
import {
	getUserWithHash,
	hasDbUsers
} from '@dashboard-builder/emis-server/modules/users/repository';
import { verifyPassword } from '@dashboard-builder/emis-server/modules/users/password';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmisRole = 'viewer' | 'editor' | 'admin';

export type EmisSession = {
	userId: string;
	username: string;
	role: EmisRole;
	createdAt: number;
};

type EmisUserConfig = {
	id: string;
	username: string;
	password: string;
	role: EmisRole;
};

// ---------------------------------------------------------------------------
// Auth mode
// ---------------------------------------------------------------------------

/**
 * Determine EMIS auth mode.
 *
 * Default is 'session' (AUTH-7). Opt out with EMIS_AUTH_MODE=none.
 *
 * Safety net: if mode resolves to 'session' but there are no configured users
 * (no DB users, no EMIS_USERS env, no EMIS_ADMIN_PASSWORD), log a warning
 * and fall back to 'none' to avoid locking everyone out.
 */
export function getAuthMode(): 'none' | 'session' {
	const mode = process.env.EMIS_AUTH_MODE;
	if (mode === 'none') return 'none';

	// Default is 'session'. Check safety net.
	if (!_safetyNetChecked) {
		_safetyNetChecked = true;
		const hasEnvUsers = (process.env.EMIS_USERS?.trim() ?? '').length > 0;
		const hasAdminPassword = (process.env.EMIS_ADMIN_PASSWORD?.trim() ?? '').length > 0;
		// DB users check is async and cached separately — at startup the cache
		// is empty, so we can only check synchronous env signals. The async
		// isSessionAuthReadyAsync() handles the full check at request time.
		if (!hasEnvUsers && !hasAdminPassword && _dbUsersAvailable !== true) {
			console.warn(
				'[emis:auth] EMIS_AUTH_MODE defaults to "session", but no user source is configured ' +
					'(no DB users detected, no EMIS_USERS env, no EMIS_ADMIN_PASSWORD). ' +
					'Falling back to auth mode "none". Set EMIS_AUTH_MODE=session explicitly once users are configured.'
			);
			return 'none';
		}
	}

	return 'session';
}

let _safetyNetChecked = false;

/**
 * Reset the safety-net check flag. Useful for tests or after user creation
 * so that subsequent getAuthMode() calls re-evaluate.
 */
export function resetAuthModeCheck(): void {
	_safetyNetChecked = false;
}

export function isAuthEnabled(): boolean {
	return getAuthMode() === 'session';
}

// ---------------------------------------------------------------------------
// Session TTL
// ---------------------------------------------------------------------------

function getSessionTtlHours(): number {
	const raw = process.env.EMIS_SESSION_TTL_HOURS;
	if (raw) {
		const parsed = parseInt(raw, 10);
		if (!isNaN(parsed) && parsed > 0) return parsed;
	}
	return 24;
}

function getSessionMaxAgeMs(): number {
	return getSessionTtlHours() * 60 * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Role hierarchy
// ---------------------------------------------------------------------------

const ROLE_LEVEL: Record<EmisRole, number> = {
	viewer: 0,
	editor: 1,
	admin: 2
};

export function hasMinRole(actual: EmisRole, required: EmisRole): boolean {
	return ROLE_LEVEL[actual] >= ROLE_LEVEL[required];
}

// ---------------------------------------------------------------------------
// User store — env-based (legacy fallback)
// ---------------------------------------------------------------------------

let _parsedEnvUsers: EmisUserConfig[] | null = null;

function getEnvUsers(): EmisUserConfig[] {
	if (_parsedEnvUsers !== null) return _parsedEnvUsers;

	const raw = process.env.EMIS_USERS?.trim();
	if (!raw) {
		_parsedEnvUsers = [];
		return _parsedEnvUsers;
	}

	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			console.warn('[emis:auth] EMIS_USERS must be a JSON array. Env fallback disabled.');
			_parsedEnvUsers = [];
			return _parsedEnvUsers;
		}

		_parsedEnvUsers = parsed.filter(
			(u: unknown): u is EmisUserConfig =>
				typeof u === 'object' &&
				u !== null &&
				typeof (u as EmisUserConfig).id === 'string' &&
				typeof (u as EmisUserConfig).username === 'string' &&
				typeof (u as EmisUserConfig).password === 'string' &&
				['viewer', 'editor', 'admin'].includes((u as EmisUserConfig).role)
		);

		if (_parsedEnvUsers.length === 0) {
			console.warn(
				'[emis:auth] EMIS_USERS parsed but no valid users found. Env fallback disabled.'
			);
		}

		return _parsedEnvUsers;
	} catch {
		console.warn('[emis:auth] Failed to parse EMIS_USERS JSON. Env fallback disabled.');
		_parsedEnvUsers = [];
		return _parsedEnvUsers;
	}
}

// ---------------------------------------------------------------------------
// User store — DB availability check (cached)
// ---------------------------------------------------------------------------

/**
 * Cached flag: null = not checked yet, true/false = DB has users.
 * Resets on server restart or explicit invalidation.
 */
let _dbUsersAvailable: boolean | null = null;

/**
 * Check if DB users exist. Cached after first successful check.
 * On DB error, returns false (falls back to env).
 */
async function getDbUsersAvailable(): Promise<boolean> {
	if (_dbUsersAvailable !== null) return _dbUsersAvailable;

	try {
		_dbUsersAvailable = await hasDbUsers();
		return _dbUsersAvailable;
	} catch (err) {
		console.warn('[emis:auth] Cannot reach emis.users table, falling back to env users.', err);
		return false;
	}
}

/**
 * Invalidate the DB users cache. Call after creating/deleting users
 * so that subsequent auth checks re-query the DB.
 */
export function invalidateDbUsersCache(): void {
	_dbUsersAvailable = null;
}

// ---------------------------------------------------------------------------
// Session auth readiness
// ---------------------------------------------------------------------------

/**
 * Async check: can session auth work?
 * Auth mode is session AND (DB users exist OR env users configured).
 */
export async function isSessionAuthReadyAsync(): Promise<boolean> {
	if (!isAuthEnabled()) return false;

	const dbReady = await getDbUsersAvailable();
	if (dbReady) return true;

	return getEnvUsers().length > 0;
}

/**
 * Synchronous check for session auth readiness.
 * Uses cached DB check result. If DB hasn't been checked yet, only considers env users.
 * Prefer isSessionAuthReadyAsync() in async contexts.
 */
export function isSessionAuthReady(): boolean {
	if (!isAuthEnabled()) return false;

	// If we've already checked DB and it has users
	if (_dbUsersAvailable === true) return true;

	// Env fallback
	if (getEnvUsers().length > 0) return true;

	return false;
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

/**
 * Authenticate a user by username and password.
 *
 * Resolution order (AUTH-3 contract, docs/emis_access_model.md section 5):
 *   1. If DB users exist: look up by username, verify with bcrypt.compare()
 *   2. If DB empty/unreachable AND EMIS_USERS env set: plaintext compare (backward compat)
 *
 * Returns { id, username, role } on success, null on failure.
 * Async because bcrypt.compare() is async (non-blocking).
 */
export async function authenticateUser(
	username: string,
	password: string
): Promise<{ id: string; username: string; role: EmisRole } | null> {
	const dbAvailable = await getDbUsersAvailable();

	// Try DB first
	if (dbAvailable) {
		try {
			const dbUser = await getUserWithHash(username);
			if (!dbUser) return null;

			const match = await verifyPassword(password, dbUser.passwordHash);
			if (!match) return null;

			return {
				id: dbUser.id,
				username: dbUser.username,
				role: dbUser.role as EmisRole
			};
		} catch (err) {
			console.warn('[emis:auth] DB auth lookup failed, trying env fallback.', err);
			// Only fall through to env if DB was supposed to be available but failed
		}
	}

	// Env fallback: plaintext comparison (backward compat with DF-3)
	const envUsers = getEnvUsers();
	if (envUsers.length > 0) {
		if (dbAvailable) {
			// DB has users but query failed on this specific call — don't use env fallback
			// (env is only for when DB is empty, not for error recovery)
			return null;
		}

		console.warn(
			'[emis:auth] Using EMIS_USERS env fallback for authentication. ' +
				'Migrate to DB users (emis.users table) for production.'
		);

		const envUser = envUsers.find(
			(u) => u.username === username && u.password === password
		);
		if (!envUser) return null;

		return {
			id: envUser.id,
			username: envUser.username,
			role: envUser.role
		};
	}

	return null;
}

// ---------------------------------------------------------------------------
// In-memory session fallback
// ---------------------------------------------------------------------------

const memorySessions = new Map<string, EmisSession>();

// ---------------------------------------------------------------------------
// DB availability detection
// ---------------------------------------------------------------------------

/**
 * Check whether the DB session store is available.
 * Tries to use the session repo; if it throws (no DATABASE_URL, connection error),
 * we fall back to in-memory.
 */
let _dbAvailable: boolean | null = null;
let _dbCheckPromise: Promise<boolean> | null = null;

async function isDbAvailable(): Promise<boolean> {
	// If we already checked and got a definitive answer, use it
	if (_dbAvailable !== null) return _dbAvailable;

	// Avoid concurrent probe calls
	if (_dbCheckPromise) return _dbCheckPromise;

	_dbCheckPromise = (async () => {
		try {
			// Quick probe: try to get a non-existent session.
			// If the table exists and DB is reachable, this returns null (not an error).
			await sessionRepo.getSession('00000000-0000-0000-0000-000000000000');
			_dbAvailable = true;
			return true;
		} catch {
			console.warn(
				'[emis:auth] DB session store unavailable, falling back to in-memory sessions.'
			);
			_dbAvailable = false;
			return false;
		} finally {
			_dbCheckPromise = null;
		}
	})();

	return _dbCheckPromise;
}

/**
 * Reset DB availability flag. Call this to force a re-check
 * (e.g., after a reconnect).
 */
export function resetDbAvailability(): void {
	_dbAvailable = null;
}

// ---------------------------------------------------------------------------
// Session store (DB-backed with in-memory fallback)
// ---------------------------------------------------------------------------

/**
 * Create a session. Primary: DB. Fallback: in-memory Map.
 * Returns the session ID (UUID).
 */
export async function createSession(user: {
	id: string;
	username: string;
	role: EmisRole;
}): Promise<string> {
	const ttlHours = getSessionTtlHours();

	if (await isDbAvailable()) {
		try {
			const sessionId = await sessionRepo.createSession(user.id, user.role, ttlHours);

			// Also store in memory for fast reads (cache)
			memorySessions.set(sessionId, {
				userId: user.id,
				username: user.username,
				role: user.role,
				createdAt: Date.now()
			});

			return sessionId;
		} catch (err) {
			console.warn('[emis:auth] DB createSession failed, falling back to in-memory:', err);
			_dbAvailable = false;
		}
	}

	// In-memory fallback
	const sessionId = randomUUID();
	memorySessions.set(sessionId, {
		userId: user.id,
		username: user.username,
		role: user.role,
		createdAt: Date.now()
	});
	return sessionId;
}

/**
 * Get a session by ID. Primary: DB. Fallback: in-memory Map.
 * Returns null if session not found or expired.
 */
export async function getSession(sessionId: string): Promise<EmisSession | null> {
	if (await isDbAvailable()) {
		try {
			// Check in-memory cache first for username (DB sessions don't store username)
			const cached = memorySessions.get(sessionId);

			const dbSession = await sessionRepo.getSession(sessionId);
			if (!dbSession) {
				// Clean up memory cache if DB says session is gone
				if (cached) memorySessions.delete(sessionId);
				return null;
			}

			// We need the username. Check cache first, then query DB.
			let username = cached?.username;
			if (!username) {
				username = (await sessionRepo.getSessionUsername(dbSession.userId)) ?? 'unknown';
			}

			const session: EmisSession = {
				userId: dbSession.userId,
				username,
				role: dbSession.role as EmisRole,
				createdAt: dbSession.createdAt.getTime()
			};

			// Update memory cache
			memorySessions.set(sessionId, session);

			return session;
		} catch (err) {
			console.warn('[emis:auth] DB getSession failed, falling back to in-memory:', err);
			_dbAvailable = false;
		}
	}

	// In-memory fallback
	const session = memorySessions.get(sessionId);
	if (!session) return null;

	// Check expiry
	if (Date.now() - session.createdAt > getSessionMaxAgeMs()) {
		memorySessions.delete(sessionId);
		return null;
	}

	return session;
}

/**
 * Delete a session by ID. Primary: DB. Fallback: in-memory Map.
 */
export async function deleteSession(sessionId: string): Promise<void> {
	// Always remove from memory cache
	memorySessions.delete(sessionId);

	if (await isDbAvailable()) {
		try {
			await sessionRepo.deleteSession(sessionId);
		} catch (err) {
			console.warn('[emis:auth] DB deleteSession failed:', err);
		}
	}
}

/**
 * Delete all sessions for a given user.
 * Used for user deactivation / admin password reset.
 */
export async function deleteUserSessions(userId: string): Promise<void> {
	// Clean from memory cache
	for (const [id, session] of memorySessions) {
		if (session.userId === userId) {
			memorySessions.delete(id);
		}
	}

	if (await isDbAvailable()) {
		try {
			await sessionRepo.deleteUserSessions(userId);
		} catch (err) {
			console.warn('[emis:auth] DB deleteUserSessions failed:', err);
		}
	}
}

/**
 * Delete all sessions for a given user EXCEPT the specified session.
 * Used for change-password flow: invalidate other sessions, keep current.
 */
export async function deleteUserSessionsExcept(
	userId: string,
	keepSessionId: string
): Promise<void> {
	// Clean from memory cache (keep the specified session)
	for (const [id, session] of memorySessions) {
		if (session.userId === userId && id !== keepSessionId) {
			memorySessions.delete(id);
		}
	}

	if (await isDbAvailable()) {
		try {
			await sessionRepo.deleteUserSessionsExcept(userId, keepSessionId);
		} catch (err) {
			console.warn('[emis:auth] DB deleteUserSessionsExcept failed:', err);
		}
	}
}

// ---------------------------------------------------------------------------
// Periodic cleanup
// ---------------------------------------------------------------------------

let _cleanupInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start periodic cleanup of expired sessions.
 * Runs every `intervalMinutes` (default: 60).
 * Cleans both DB (if available) and in-memory store.
 */
export function startSessionCleanup(intervalMinutes = 60): void {
	if (_cleanupInterval) return; // Already running

	const intervalMs = intervalMinutes * 60 * 1000;
	const maxAgeMs = getSessionMaxAgeMs();

	_cleanupInterval = setInterval(async () => {
		// Clean in-memory expired sessions
		const now = Date.now();
		for (const [id, session] of memorySessions) {
			if (now - session.createdAt > maxAgeMs) {
				memorySessions.delete(id);
			}
		}

		// Clean DB expired sessions
		if (await isDbAvailable()) {
			try {
				const count = await sessionRepo.cleanupExpiredSessions();
				if (count > 0) {
					console.log(`[emis:auth] Cleaned up ${count} expired sessions from DB.`);
				}
			} catch (err) {
				console.warn('[emis:auth] DB session cleanup failed:', err);
			}
		}
	}, intervalMs);

	// Don't prevent Node.js from exiting
	if (_cleanupInterval.unref) {
		_cleanupInterval.unref();
	}
}

/**
 * Stop periodic session cleanup.
 */
export function stopSessionCleanup(): void {
	if (_cleanupInterval) {
		clearInterval(_cleanupInterval);
		_cleanupInterval = null;
	}
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

export const SESSION_COOKIE_NAME = 'emis_session';

export function getSessionCookieMaxAge(): number {
	return getSessionTtlHours() * 60 * 60; // seconds
}

export const SESSION_COOKIE_MAX_AGE = 86400; // 24 hours in seconds (legacy constant)

export function isSecureCookie(): boolean {
	return process.env.NODE_ENV === 'production';
}

// ---------------------------------------------------------------------------
// Route classification
// ---------------------------------------------------------------------------

/** Routes that bypass auth checks (login/logout pages). */
export function isAuthRoute(pathname: string): boolean {
	return pathname === '/emis/login' || pathname === '/emis/logout';
}

/** EMIS API routes that require auth when enabled. */
export function isEmisApiRoute(pathname: string): boolean {
	return pathname.startsWith('/api/emis/');
}

/** EMIS page routes that require auth when enabled. */
export function isEmisPageRoute(pathname: string): boolean {
	return pathname.startsWith('/emis/') || pathname === '/emis';
}

/** Admin routes that require admin role. */
export function isAdminRoute(pathname: string): boolean {
	return pathname.startsWith('/emis/admin/') || pathname === '/emis/admin';
}

/** Dictionary API routes — writes require admin role (docs/emis_access_model.md:31). */
export function isDictionaryApiRoute(pathname: string): boolean {
	return pathname.startsWith('/api/emis/dictionaries/');
}

/** Admin API routes — all methods require admin role (docs/emis_access_model.md section 5). */
export function isAdminApiRoute(pathname: string): boolean {
	return pathname.startsWith('/api/emis/admin/');
}
