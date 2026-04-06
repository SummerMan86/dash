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
import { getUserById } from '@dashboard-builder/emis-server/modules/users/repository';
import {
	deleteManagedUserService,
	updateManagedUserService
} from '@dashboard-builder/emis-server/modules/users/service';
import { EmisError } from '@dashboard-builder/emis-server/infra/errors';
import { requireUuid, handleEmisRoute, parseJsonBody } from '$lib/server/emis/infra/http';
import { assertWriteContext } from '$lib/server/emis/infra/writePolicy';
import { invalidateDbUsersCache, deleteUserSessions } from '$lib/server/emis/infra/auth';

export const PATCH: RequestHandler = handleEmisRoute(async ({ params, request, locals }) => {
	const id = requireUuid(params.id, 'user id');
	const context = assertWriteContext(request, 'api', locals);

	const body = await parseJsonBody(request, updateUserSchema);
	const updated = await updateManagedUserService(id, body, context);

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
	const context = assertWriteContext(request, 'api', locals);

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

	await deleteManagedUserService(id, context);

	// Invalidate cached DB users flag
	invalidateDbUsersCache();

	return json({ ok: true });
}, 'Failed to delete EMIS user');
