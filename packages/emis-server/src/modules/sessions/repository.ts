/**
 * Session Repository — DB-backed session persistence for EMIS auth.
 *
 * All SQL for `emis.sessions` lives here.
 * Canonical contract: docs/emis_access_model.md section 5.
 *
 * Session shape stored in DB:
 *   id (UUID PK), user_id (UUID FK -> emis.users), role (text),
 *   created_at (timestamptz), expires_at (timestamptz)
 */

import type { PoolClient } from 'pg';

import { getDb } from '../../infra/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DbSession = {
	id: string;
	userId: string;
	role: string;
	createdAt: Date;
	expiresAt: Date;
};

// ---------------------------------------------------------------------------
// Session CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new session in the DB.
 * Returns the generated session UUID.
 */
export async function createSession(
	userId: string,
	role: string,
	ttlHours: number,
	client?: PoolClient
): Promise<string> {
	const db = getDb(client);
	const result = await db.query(
		`INSERT INTO emis.sessions (user_id, role, expires_at)
		 VALUES ($1, $2, now() + make_interval(hours => $3))
		 RETURNING id`,
		[userId, role, ttlHours]
	);
	return result.rows[0].id as string;
}

/**
 * Get a session by ID. Returns null if not found or expired.
 * Lazily deletes expired sessions on read.
 */
export async function getSession(
	sessionId: string,
	client?: PoolClient
): Promise<DbSession | null> {
	const db = getDb(client);
	const result = await db.query(
		`SELECT id, user_id, role, created_at, expires_at
		 FROM emis.sessions
		 WHERE id = $1`,
		[sessionId]
	);

	if (result.rowCount === 0) return null;

	const row = result.rows[0];
	const expiresAt = row.expires_at as Date;

	// Lazy expiry check: if expired, delete and return null
	if (expiresAt.getTime() < Date.now()) {
		await db.query('DELETE FROM emis.sessions WHERE id = $1', [sessionId]);
		return null;
	}

	return {
		id: row.id,
		userId: row.user_id,
		role: row.role,
		createdAt: row.created_at,
		expiresAt
	};
}

/**
 * Delete a specific session.
 */
export async function deleteSession(sessionId: string, client?: PoolClient): Promise<void> {
	const db = getDb(client);
	await db.query('DELETE FROM emis.sessions WHERE id = $1', [sessionId]);
}

/**
 * Delete all sessions for a given user.
 * Used for user deactivation / admin password reset.
 */
export async function deleteUserSessions(userId: string, client?: PoolClient): Promise<void> {
	const db = getDb(client);
	await db.query('DELETE FROM emis.sessions WHERE user_id = $1', [userId]);
}

/**
 * Delete all sessions for a given user EXCEPT the specified session.
 * Used for change-password flow: invalidate other sessions, keep current.
 */
export async function deleteUserSessionsExcept(
	userId: string,
	keepSessionId: string,
	client?: PoolClient
): Promise<void> {
	const db = getDb(client);
	await db.query('DELETE FROM emis.sessions WHERE user_id = $1 AND id != $2', [
		userId,
		keepSessionId
	]);
}

/**
 * Delete all expired sessions.
 * Can be called periodically or on-demand for bulk cleanup.
 */
export async function cleanupExpiredSessions(client?: PoolClient): Promise<number> {
	const db = getDb(client);
	const result = await db.query('DELETE FROM emis.sessions WHERE expires_at < now()');
	return result.rowCount ?? 0;
}

/**
 * Look up the username for a session's user.
 * Returns null if user not found.
 */
export async function getSessionUsername(
	userId: string,
	client?: PoolClient
): Promise<string | null> {
	const db = getDb(client);
	const result = await db.query('SELECT username FROM emis.users WHERE id = $1', [userId]);
	if (result.rowCount === 0) return null;
	return result.rows[0].username as string;
}
