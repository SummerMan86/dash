import type { PoolClient } from 'pg';

import type { CreateEmisObjectInput, UpdateEmisObjectInput } from '$entities/emis-object';

import { EmisError } from '../../infra/errors';
import { withTransaction } from '../../infra/db';
import { countryExists, objectTypeExists } from '../dictionaries/repository';
import { getObjectDetailQuery } from './queries';
import { objectExists, insertObject, softDeleteObject, updateObject } from './repository';

async function validateObjectReferences(
	input: { objectTypeId?: string; countryCode?: string | null },
	client?: PoolClient
) {
	if (input.objectTypeId && !(await objectTypeExists(input.objectTypeId, client))) {
		throw new EmisError(400, 'OBJECT_TYPE_NOT_FOUND', 'Object type not found');
	}
	if (input.countryCode && !(await countryExists(input.countryCode, client))) {
		throw new EmisError(400, 'COUNTRY_NOT_FOUND', 'Country not found');
	}
}

export async function createObjectService(input: CreateEmisObjectInput) {
	return withTransaction(async (client) => {
		await validateObjectReferences(input, client);
		const id = await insertObject(input, client);
		const detail = await getObjectDetailQuery(id);
		if (!detail) throw new EmisError(500, 'OBJECT_CREATE_FAILED', 'Failed to load created object');
		return detail;
	});
}

export async function updateObjectService(id: string, patch: UpdateEmisObjectInput) {
	return withTransaction(async (client) => {
		if (!(await objectExists(id, client))) {
			throw new EmisError(404, 'OBJECT_NOT_FOUND', 'Object not found');
		}
		await validateObjectReferences(patch, client);
		await updateObject(id, patch, client);
		const detail = await getObjectDetailQuery(id);
		if (!detail) throw new EmisError(500, 'OBJECT_UPDATE_FAILED', 'Failed to load updated object');
		return detail;
	});
}

export async function softDeleteObjectService(id: string) {
	const deleted = await softDeleteObject(id);
	if (!deleted) throw new EmisError(404, 'OBJECT_NOT_FOUND', 'Object not found');
}
