import type {
	AttachNewsObjectsSchemaInput,
	UpdateNewsObjectLinkInput
} from '@dashboard-builder/emis-contracts/emis-link';

import type { EmisWriteContext } from '../../infra/audit';
import { insertAuditLog } from '../../infra/audit';
import { EmisError } from '../../infra/errors';
import { withTransaction } from '../../infra/db';
import { newsExists } from '../news/repository';
import { objectExists } from '../objects/repository';
import { upsertNewsObjectLinks, updateNewsObjectLink, deleteNewsObjectLink } from './repository';

export async function attachNewsObjectsService(
	newsId: string,
	input: AttachNewsObjectsSchemaInput,
	context: EmisWriteContext
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

		const links = await upsertNewsObjectLinks(newsId, input.links, context.actorId, client);
		for (const link of links) {
			await insertAuditLog(
				{
					entityType: 'news_object_link',
					entityId: link.id,
					action: 'attach',
					payload: {
						newsId: link.newsId,
						objectId: link.objectId,
						linkType: link.linkType,
						isPrimary: link.isPrimary,
						confidence: link.confidence
					}
				},
				context,
				client
			);
		}
	});
}

export async function updateNewsObjectLinkService(
	newsId: string,
	objectId: string,
	patch: UpdateNewsObjectLinkInput,
	context: EmisWriteContext
) {
	return withTransaction(async (client) => {
		if (!(await newsExists(newsId, client))) {
			throw new EmisError(404, 'NEWS_NOT_FOUND', 'News item not found');
		}
		if (!(await objectExists(objectId, client))) {
			throw new EmisError(404, 'OBJECT_NOT_FOUND', 'Object not found');
		}
		const updated = await updateNewsObjectLink(newsId, objectId, patch, context.actorId, client);
		if (!updated) throw new EmisError(404, 'LINK_NOT_FOUND', 'News-object link not found');
		await insertAuditLog(
			{
				entityType: 'news_object_link',
				entityId: updated.id,
				action: 'update',
				payload: {
					newsId: updated.newsId,
					objectId: updated.objectId,
					linkType: updated.linkType,
					patch
				}
			},
			context,
			client
		);
	});
}

export async function deleteNewsObjectLinkService(
	newsId: string,
	objectId: string,
	context: EmisWriteContext
) {
	return withTransaction(async (client) => {
		const deleted = await deleteNewsObjectLink(newsId, objectId, client);
		if (!deleted) throw new EmisError(404, 'LINK_NOT_FOUND', 'News-object link not found');
		await insertAuditLog(
			{
				entityType: 'news_object_link',
				entityId: deleted.id,
				action: 'detach',
				payload: {
					newsId: deleted.newsId,
					objectId: deleted.objectId,
					linkType: deleted.linkType
				}
			},
			context,
			client
		);
	});
}
