import type {
	CreateUserInput,
	UpdateUserInput
} from '@dashboard-builder/emis-contracts/emis-user';

import type { EmisWriteContext } from '../../infra/audit';
import { insertAuditLog } from '../../infra/audit';
import { withTransaction } from '../../infra/db';
import { EmisError } from '../../infra/errors';
import { hashPassword } from './password';
import {
	createUser,
	deleteUser,
	getUserById,
	updateUser,
	usernameExists
} from './repository';

export async function createManagedUserService(
	input: CreateUserInput,
	context: EmisWriteContext
) {
	return withTransaction(async (client) => {
		if (await usernameExists(input.username, undefined, client)) {
			throw new EmisError(409, 'USERNAME_TAKEN', `Username "${input.username}" is already taken`);
		}

		const passwordHash = await hashPassword(input.password);
		const created = await createUser(
			{
				username: input.username,
				passwordHash,
				role: input.role
			},
			client
		);

		await insertAuditLog(
			{
				entityType: 'user_account',
				entityId: created.id,
				action: 'create',
				payload: {
					username: created.username,
					role: created.role
				}
			},
			context,
			client
		);

		return created;
	});
}

export async function updateManagedUserService(
	id: string,
	patch: UpdateUserInput,
	context: EmisWriteContext
) {
	return withTransaction(async (client) => {
		const existing = await getUserById(id, client);
		if (!existing) {
			throw new EmisError(404, 'USER_NOT_FOUND', `User ${id} not found`);
		}

		if (patch.username && patch.username !== existing.username) {
			const taken = await usernameExists(patch.username, id, client);
			if (taken) {
				throw new EmisError(409, 'USERNAME_TAKEN', `Username "${patch.username}" is already taken`);
			}
		}

		const updatePatch: { username?: string; passwordHash?: string; role?: string } = {};
		if (patch.username !== undefined) updatePatch.username = patch.username;
		if (patch.role !== undefined) updatePatch.role = patch.role;
		if (patch.password !== undefined) {
			updatePatch.passwordHash = await hashPassword(patch.password);
		}

		const updated = await updateUser(id, updatePatch, client);
		if (!updated) {
			throw new EmisError(404, 'USER_NOT_FOUND', `User ${id} not found`);
		}

		await insertAuditLog(
			{
				entityType: 'user_account',
				entityId: updated.id,
				action: 'update',
				payload: {
					username: updated.username,
					role: updated.role,
					changedFields: {
						username: patch.username !== undefined,
						role: patch.role !== undefined,
						passwordReset: patch.password !== undefined
					}
				}
			},
			context,
			client
		);

		return updated;
	});
}

export async function deleteManagedUserService(id: string, context: EmisWriteContext) {
	return withTransaction(async (client) => {
		const existing = await getUserById(id, client);
		if (!existing) {
			throw new EmisError(404, 'USER_NOT_FOUND', `User ${id} not found`);
		}

		const deleted = await deleteUser(id, client);
		if (!deleted) {
			throw new EmisError(404, 'USER_NOT_FOUND', `User ${id} not found`);
		}

		await insertAuditLog(
			{
				entityType: 'user_account',
				entityId: existing.id,
				action: 'delete',
				payload: {
					username: existing.username,
					role: existing.role
				}
			},
			context,
			client
		);
	});
}
