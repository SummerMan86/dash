/**
 * EMIS User Repository — SQL queries for emis.users.
 *
 * Canonical contract: docs/emis_access_model.md section 5.
 *
 * IMPORTANT: password_hash is NEVER returned by public query functions
 * (listUsers, getUserById, getUserByUsername). Use getUserWithHash()
 * for auth-internal lookups only.
 */

import type { PoolClient } from 'pg';

import type { EmisUser, EmisUserWithHash } from '@dashboard-builder/emis-contracts/emis-user';

import { getDb } from '../../infra/db';

// ---------------------------------------------------------------------------
// Public queries (no password_hash)
// ---------------------------------------------------------------------------

/** List all users, ordered by username. No password_hash in result. */
export async function listUsers(client?: PoolClient): Promise<EmisUser[]> {
	const db = getDb(client);
	const result = await db.query(
		`SELECT id, username, role, created_at, updated_at
		 FROM emis.users
		 ORDER BY username ASC`
	);
	return result.rows.map(mapUserRow);
}

/** Get user by ID. Returns null if not found. No password_hash. */
export async function getUserById(id: string, client?: PoolClient): Promise<EmisUser | null> {
	const db = getDb(client);
	const result = await db.query(
		`SELECT id, username, role, created_at, updated_at
		 FROM emis.users WHERE id = $1`,
		[id]
	);
	if (result.rowCount === 0) return null;
	return mapUserRow(result.rows[0]);
}

/** Get user by username. Returns null if not found. No password_hash. */
export async function getUserByUsername(
	username: string,
	client?: PoolClient
): Promise<EmisUser | null> {
	const db = getDb(client);
	const result = await db.query(
		`SELECT id, username, role, created_at, updated_at
		 FROM emis.users WHERE username = $1`,
		[username]
	);
	if (result.rowCount === 0) return null;
	return mapUserRow(result.rows[0]);
}

// ---------------------------------------------------------------------------
// Internal auth query (includes password_hash)
// ---------------------------------------------------------------------------

/**
 * Get user with password hash by username. For auth only — never expose result.
 * Returns null if not found.
 */
export async function getUserWithHash(
	username: string,
	client?: PoolClient
): Promise<EmisUserWithHash | null> {
	const db = getDb(client);
	const result = await db.query(
		`SELECT id, username, password_hash, role, created_at, updated_at
		 FROM emis.users WHERE username = $1`,
		[username]
	);
	if (result.rowCount === 0) return null;
	return mapUserWithHashRow(result.rows[0]);
}

/** Check if any users exist in the DB (for env fallback logic). */
export async function hasDbUsers(client?: PoolClient): Promise<boolean> {
	const db = getDb(client);
	const result = await db.query('SELECT 1 FROM emis.users LIMIT 1');
	return (result.rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Create a new user. Password must already be hashed. Returns public user (no hash). */
export async function createUser(
	input: { username: string; passwordHash: string; role: string },
	client?: PoolClient
): Promise<EmisUser> {
	const db = getDb(client);
	const result = await db.query(
		`INSERT INTO emis.users (username, password_hash, role)
		 VALUES ($1, $2, $3)
		 RETURNING id, username, role, created_at, updated_at`,
		[input.username, input.passwordHash, input.role]
	);
	return mapUserRow(result.rows[0]);
}

/**
 * Update a user. Only provided fields are updated.
 * If passwordHash is provided, password_hash is updated.
 * Returns updated public user or null if not found.
 */
export async function updateUser(
	id: string,
	patch: { username?: string; passwordHash?: string; role?: string },
	client?: PoolClient
): Promise<EmisUser | null> {
	const db = getDb(client);
	const sets: string[] = [];
	const values: unknown[] = [];
	let idx = 1;

	if (patch.username !== undefined) {
		sets.push(`username = $${idx++}`);
		values.push(patch.username);
	}
	if (patch.passwordHash !== undefined) {
		sets.push(`password_hash = $${idx++}`);
		values.push(patch.passwordHash);
	}
	if (patch.role !== undefined) {
		sets.push(`role = $${idx++}`);
		values.push(patch.role);
	}

	if (sets.length === 0) return null;

	// Always bump updated_at
	sets.push('updated_at = now()');

	values.push(id);
	const result = await db.query(
		`UPDATE emis.users SET ${sets.join(', ')} WHERE id = $${idx}
		 RETURNING id, username, role, created_at, updated_at`,
		values
	);
	if (result.rowCount === 0) return null;
	return mapUserRow(result.rows[0]);
}

/** Delete a user by ID. Returns true if deleted, false if not found. */
export async function deleteUser(id: string, client?: PoolClient): Promise<boolean> {
	const db = getDb(client);
	const result = await db.query('DELETE FROM emis.users WHERE id = $1', [id]);
	return (result.rowCount ?? 0) > 0;
}

/** Check if a username is already taken (optionally excluding a specific user). */
export async function usernameExists(
	username: string,
	excludeId?: string,
	client?: PoolClient
): Promise<boolean> {
	const db = getDb(client);
	if (excludeId) {
		const result = await db.query(
			'SELECT 1 FROM emis.users WHERE username = $1 AND id != $2 LIMIT 1',
			[username, excludeId]
		);
		return (result.rowCount ?? 0) > 0;
	}
	const result = await db.query('SELECT 1 FROM emis.users WHERE username = $1 LIMIT 1', [username]);
	return (result.rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapUserRow(row: any): EmisUser {
	return {
		id: row.id,
		username: row.username,
		role: row.role,
		createdAt: row.created_at.toISOString(),
		updatedAt: row.updated_at.toISOString()
	};
}

function mapUserWithHashRow(row: any): EmisUserWithHash {
	return {
		id: row.id,
		username: row.username,
		passwordHash: row.password_hash,
		role: row.role,
		createdAt: row.created_at.toISOString(),
		updatedAt: row.updated_at.toISOString()
	};
}
/* eslint-enable @typescript-eslint/no-explicit-any */
