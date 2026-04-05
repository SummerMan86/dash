/**
 * Admin User Management API — update and delete individual users.
 *
 * PATCH  /api/emis/admin/users/:id — update user (role, password)
 * DELETE /api/emis/admin/users/:id — delete user
 *
 * Admin role enforced by hooks.server.ts (isAdminApiRoute check).
 * Writes go through assertWriteContext() for audit + role validation.
 *
 * Canonical contract: docs/emis_access_model.md section 5 (AUTH-5).
 */

import { json, type RequestHandler } from '@sveltejs/kit';

import { updateUserSchema } from '@dashboard-builder/emis-contracts/emis-user';
import { hashPassword } from '@dashboard-builder/emis-server/modules/users/password';
import {
	getUserById,
	updateUser,
	deleteUser,
	usernameExists
} from '@dashboard-builder/emis-server/modules/users/repository';
import { EmisError } from '@dashboard-builder/emis-server/infra/errors';
import { requireUuid, handleEmisRoute, parseJsonBody } from '$lib/server/emis/infra/http';
import { assertWriteContext } from '$lib/server/emis/infra/writePolicy';
import { invalidateDbUsersCache, deleteUserSessions } from '$lib/server/emis/infra/auth';

export const PATCH: RequestHandler = handleEmisRoute(async ({ params, request, locals }) => {
	const id = requireUuid(params.id, 'user id');
	assertWriteContext(request, 'api', locals);

	const body = await parseJsonBody(request, updateUserSchema);

	// Check that user exists
	const existing = await getUserById(id);
	if (!existing) {
		throw new EmisError(404, 'USER_NOT_FOUND', `User ${id} not found`);
	}

	// Check username uniqueness if changing username
	if (body.username && body.username !== existing.username) {
		const taken = await usernameExists(body.username, id);
		if (taken) {
			throw new EmisError(409, 'USERNAME_TAKEN', `Username "${body.username}" is already taken`);
		}
	}

	// Hash new password if provided
	const patch: { username?: string; passwordHash?: string; role?: string } = {};
	if (body.username !== undefined) patch.username = body.username;
	if (body.role !== undefined) patch.role = body.role;
	if (body.password !== undefined) {
		patch.passwordHash = await hashPassword(body.password);
	}

	const updated = await updateUser(id, patch);
	if (!updated) {
		throw new EmisError(404, 'USER_NOT_FOUND', `User ${id} not found`);
	}

	// Invalidate cached DB users flag
	invalidateDbUsersCache();

	// If password was changed, invalidate all sessions for this user
	if (body.password !== undefined) {
		await deleteUserSessions(id);
	}

	return json(updated);
}, 'Failed to update EMIS user');

export const DELETE: RequestHandler = handleEmisRoute(async ({ params, request, locals }) => {
	const id = requireUuid(params.id, 'user id');
	assertWriteContext(request, 'api', locals);

	// Admin cannot delete themselves
	const session = locals.emisSession;
	if (session && session.userId === id) {
		throw new EmisError(400, 'SELF_DELETE_FORBIDDEN', 'Admin cannot delete their own account');
	}

	// Check that user exists
	const existing = await getUserById(id);
	if (!existing) {
		throw new EmisError(404, 'USER_NOT_FOUND', `User ${id} not found`);
	}

	// Delete all sessions for this user first
	await deleteUserSessions(id);

	// Delete the user
	const deleted = await deleteUser(id);
	if (!deleted) {
		throw new EmisError(404, 'USER_NOT_FOUND', `User ${id} not found`);
	}

	// Invalidate cached DB users flag
	invalidateDbUsersCache();

	return json({ ok: true });
}, 'Failed to delete EMIS user');
