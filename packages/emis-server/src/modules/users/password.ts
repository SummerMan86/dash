/**
 * Password hashing utilities for EMIS user management.
 *
 * Uses bcryptjs (pure JS, no native compilation needed).
 * All functions are async to avoid blocking the event loop.
 *
 * Canonical contract: docs/emis/access_model.md.
 */

import bcrypt from 'bcryptjs';

/**
 * Resolve bcrypt cost factor from `EMIS_BCRYPT_ROUNDS` env var.
 * Default: 12. Enforced range: 10..14.
 */
export function getBcryptRounds(): number {
	const raw = process.env.EMIS_BCRYPT_ROUNDS;
	if (!raw) return 12;

	const parsed = parseInt(raw, 10);
	if (isNaN(parsed) || parsed < 10 || parsed > 14) {
		console.warn(
			`[emis:auth] EMIS_BCRYPT_ROUNDS=${raw} is invalid (must be 10..14). Using default 12.`
		);
		return 12;
	}
	return parsed;
}

/**
 * Hash a plaintext password with bcrypt.
 * Uses the configured cost factor (EMIS_BCRYPT_ROUNDS env, default 12).
 */
export async function hashPassword(plaintext: string): Promise<string> {
	const rounds = getBcryptRounds();
	return bcrypt.hash(plaintext, rounds);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 * Returns true if the password matches.
 */
export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
	return bcrypt.compare(plaintext, hash);
}
