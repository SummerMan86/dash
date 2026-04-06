/**
 * Admin User Management API — list and create users.
 *
 * GET  /api/emis/admin/users — list all users (no password_hash)
 * POST /api/emis/admin/users — create a new user
 *
 * Admin role enforced by hooks.server.ts (isAdminApiRoute check).
 * Writes go through assertWriteContext() for audit + role validation.
 *
 * Canonical contract: docs/emis_access_model.md section 5 (AUTH-5).
 */

import { json, type RequestHandler } from '@sveltejs/kit';

import { createUserSchema } from '@dashboard-builder/emis-contracts/emis-user';
import { listUsers } from '@dashboard-builder/emis-server/modules/users/repository';
import { createManagedUserService } from '@dashboard-builder/emis-server/modules/users/service';
import { handleEmisRoute, parseJsonBody } from '$lib/server/emis/infra/http';
import { assertWriteContext } from '$lib/server/emis/infra/writePolicy';
import { invalidateDbUsersCache } from '$lib/server/emis/infra/auth';

export const GET: RequestHandler = handleEmisRoute(async () => {
	const users = await listUsers();
	return json({ rows: users });
}, 'Failed to list EMIS users');

export const POST: RequestHandler = handleEmisRoute(async ({ request, locals }) => {
	const context = assertWriteContext(request, 'api', locals);

	const body = await parseJsonBody(request, createUserSchema);
	const created = await createManagedUserService(body, context);

	// Invalidate cached DB users flag so auth picks up the new user
	invalidateDbUsersCache();

	return json(created, { status: 201 });
}, 'Failed to create EMIS user');
