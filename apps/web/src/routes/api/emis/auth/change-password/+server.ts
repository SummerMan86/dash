/**
 * POST /api/emis/auth/change-password
 *
 * Allows any authenticated user to change their own password.
 *
 * Body: { currentPassword: string, newPassword: string }
 *
 * Flow:
 *   1. Verify currentPassword against stored bcrypt hash.
 *   2. Validate newPassword (min 8 chars via Zod schema).
 *   3. Hash newPassword with bcrypt, update emis.users.password_hash.
 *   4. Invalidate all OTHER sessions for this user (keep current session).
 *   5. Return 200 { ok: true }.
 *
 * Canonical contract: docs/emis/access_model.md.
 * No SQL in this file. DB queries delegated to emis-server repositories.
 */

import { json, type RequestHandler } from '@sveltejs/kit';

import { changePasswordSchema } from '@dashboard-builder/emis-contracts/emis-user';
import {
	getUserWithHash,
	updateUser
} from '@dashboard-builder/emis-server/modules/users/repository';
import {
	verifyPassword,
	hashPassword
} from '@dashboard-builder/emis-server/modules/users/password';
import { EmisError } from '@dashboard-builder/emis-server/infra/errors';
import { handleEmisRoute, parseJsonBody } from '$lib/server/emis/infra/http';
import { deleteUserSessionsExcept, SESSION_COOKIE_NAME } from '$lib/server/emis/infra/auth';

export const POST: RequestHandler = handleEmisRoute(async ({ request, locals, cookies }) => {
	// --- Auth check: require authenticated session ---
	const session = locals.emisSession;
	if (!session) {
		throw new EmisError(401, 'UNAUTHORIZED', 'Authentication required.');
	}

	// --- Parse and validate request body ---
	const body = await parseJsonBody(request, changePasswordSchema);

	// --- Look up user with password hash ---
	const user = await getUserWithHash(session.username);
	if (!user) {
		// User was deleted between session creation and this request
		throw new EmisError(404, 'USER_NOT_FOUND', 'User account not found.');
	}

	// --- Verify current password ---
	const currentValid = await verifyPassword(body.currentPassword, user.passwordHash);
	if (!currentValid) {
		throw new EmisError(403, 'INVALID_PASSWORD', 'Current password is incorrect.');
	}

	// --- Hash new password and update DB ---
	const newHash = await hashPassword(body.newPassword);
	await updateUser(user.id, { passwordHash: newHash });

	// --- Invalidate all other sessions (keep current) ---
	const currentSessionId = cookies.get(SESSION_COOKIE_NAME);
	if (currentSessionId) {
		await deleteUserSessionsExcept(session.userId, currentSessionId);
	}

	return json({ ok: true });
}, 'Failed to change password');
