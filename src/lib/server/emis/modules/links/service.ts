import type { AttachNewsObjectsSchemaInput, UpdateNewsObjectLinkInput } from '$entities/emis-link';

import { EmisError } from '../../infra/errors';
import { withTransaction } from '../../infra/db';
import { newsExists } from '../news/repository';
import { objectExists } from '../objects/repository';
import { upsertNewsObjectLinks, updateNewsObjectLink, deleteNewsObjectLink } from './repository';

export async function attachNewsObjectsService(
	newsId: string,
	input: AttachNewsObjectsSchemaInput
) {
	return withTransaction(async (client) => {
		if (!(await newsExists(newsId, client))) {
			throw new EmisError(404, 'NEWS_NOT_FOUND', 'News item not found');
		}

		for (const link of input.links) {
			if (!(await objectExists(link.objectId, client))) {
				throw new EmisError(400, 'OBJECT_NOT_FOUND', `Linked object ${link.objectId} not found`);
			}
		}

		await upsertNewsObjectLinks(newsId, input.links, client);
	});
}

export async function updateNewsObjectLinkService(
	newsId: string,
	objectId: string,
	patch: UpdateNewsObjectLinkInput
) {
	return withTransaction(async (client) => {
		if (!(await newsExists(newsId, client))) {
			throw new EmisError(404, 'NEWS_NOT_FOUND', 'News item not found');
		}
		if (!(await objectExists(objectId, client))) {
			throw new EmisError(404, 'OBJECT_NOT_FOUND', 'Object not found');
		}
		const updated = await updateNewsObjectLink(newsId, objectId, patch, client);
		if (!updated) throw new EmisError(404, 'LINK_NOT_FOUND', 'News-object link not found');
	});
}

export async function deleteNewsObjectLinkService(newsId: string, objectId: string) {
	const deleted = await deleteNewsObjectLink(newsId, objectId);
	if (!deleted) throw new EmisError(404, 'LINK_NOT_FOUND', 'News-object link not found');
}
