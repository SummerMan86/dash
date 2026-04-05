/**
 * EMIS User types.
 *
 * EmisUser — public projection (no password_hash). Safe for API responses.
 * EmisUserWithHash — internal projection for auth. Never return to client.
 */

export type EmisRole = 'viewer' | 'editor' | 'admin';

/** Public user projection — safe for API responses. */
export type EmisUser = {
	id: string;
	username: string;
	role: EmisRole;
	createdAt: string;
	updatedAt: string;
};

/** Internal user projection with password hash — for auth only. Never return to client. */
export type EmisUserWithHash = EmisUser & {
	passwordHash: string;
};
