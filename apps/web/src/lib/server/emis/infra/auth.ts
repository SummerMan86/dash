/**
 * EMIS Session-Based Auth Module.
 *
 * Provides cookie-based session authentication for EMIS routes.
 * Controlled by `EMIS_AUTH_MODE` env var:
 *   - 'none' (default): no auth, backward-compatible with MVE
 *   - 'session': cookie-based sessions, login required for protected routes
 *
 * Canonical contract: docs/emis_access_model.md section 5.
 *
 * No SQL. No business logic beyond auth enforcement.
 */

import { randomUUID } from 'node:crypto';

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

export function getAuthMode(): 'none' | 'session' {
	const mode = process.env.EMIS_AUTH_MODE;
	if (mode === 'session') return 'session';
	return 'none';
}

export function isAuthEnabled(): boolean {
	return getAuthMode() === 'session';
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
// User store (env-based)
// ---------------------------------------------------------------------------

let _parsedUsers: EmisUserConfig[] | null = null;

function getConfiguredUsers(): EmisUserConfig[] {
	if (_parsedUsers !== null) return _parsedUsers;

	const raw = process.env.EMIS_USERS?.trim();
	if (!raw) {
		_parsedUsers = [];
		return _parsedUsers;
	}

	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			console.warn('[emis:auth] EMIS_USERS must be a JSON array. Auth will be disabled.');
			_parsedUsers = [];
			return _parsedUsers;
		}

		_parsedUsers = parsed.filter(
			(u: unknown): u is EmisUserConfig =>
				typeof u === 'object' &&
				u !== null &&
				typeof (u as EmisUserConfig).id === 'string' &&
				typeof (u as EmisUserConfig).username === 'string' &&
				typeof (u as EmisUserConfig).password === 'string' &&
				['viewer', 'editor', 'admin'].includes((u as EmisUserConfig).role)
		);

		if (_parsedUsers.length === 0) {
			console.warn('[emis:auth] EMIS_USERS parsed but no valid users found. Auth will be disabled.');
		}

		return _parsedUsers;
	} catch {
		console.warn('[emis:auth] Failed to parse EMIS_USERS JSON. Auth will be disabled.');
		_parsedUsers = [];
		return _parsedUsers;
	}
}

/**
 * Check if session auth can actually work (auth mode is session + users configured).
 */
export function isSessionAuthReady(): boolean {
	return isAuthEnabled() && getConfiguredUsers().length > 0;
}

/**
 * Authenticate a user by username and password.
 * Returns the user config if valid, null otherwise.
 */
export function authenticateUser(
	username: string,
	password: string
): EmisUserConfig | null {
	const users = getConfiguredUsers();
	return users.find((u) => u.username === username && u.password === password) ?? null;
}

// ---------------------------------------------------------------------------
// Session store (in-memory)
// ---------------------------------------------------------------------------

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

const sessions = new Map<string, EmisSession>();

export function createSession(user: { id: string; username: string; role: EmisRole }): string {
	const sessionId = randomUUID();
	sessions.set(sessionId, {
		userId: user.id,
		username: user.username,
		role: user.role,
		createdAt: Date.now()
	});
	return sessionId;
}

export function getSession(sessionId: string): EmisSession | null {
	const session = sessions.get(sessionId);
	if (!session) return null;

	// Check expiry
	if (Date.now() - session.createdAt > SESSION_MAX_AGE_MS) {
		sessions.delete(sessionId);
		return null;
	}

	return session;
}

export function deleteSession(sessionId: string): void {
	sessions.delete(sessionId);
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

export const SESSION_COOKIE_NAME = 'emis_session';
export const SESSION_COOKIE_MAX_AGE = 86400; // 24 hours in seconds

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

/** Admin API routes (dictionary writes go through assertWriteContext, so only page protection here). */
export function isAdminApiRoute(pathname: string): boolean {
	return pathname.startsWith('/api/emis/dictionaries/');
}
