import type { PoolClient } from 'pg';

import type { CreateEmisNewsInput, UpdateEmisNewsInput } from '@dashboard-builder/emis-contracts/emis-news';

import type { EmisWriteContext } from '../../infra/audit';
import { insertAuditLog } from '../../infra/audit';
import { EmisError } from '../../infra/errors';
import { withTransaction } from '../../infra/db';
import { countryExists, sourceExists } from '../dictionaries/repository';
import { getNewsDetailQuery } from './queries';
import { insertNews, newsExists, softDeleteNews, updateNews } from './repository';

async function validateNewsReferences(
	input: { sourceId?: string; countryCode?: string | null },
	client?: PoolClient
) {
	if (input.sourceId && !(await sourceExists(input.sourceId, client))) {
		throw new EmisError(400, 'SOURCE_NOT_FOUND', 'Source not found');
	}
	if (input.countryCode && !(await countryExists(input.countryCode, client))) {
		throw new EmisError(400, 'COUNTRY_NOT_FOUND', 'Country not found');
	}
}

export async function createNewsService(input: CreateEmisNewsInput, context: EmisWriteContext) {
	return withTransaction(async (client) => {
		await validateNewsReferences(input, client);
		const id = await insertNews(input, context.actorId, client);
		await insertAuditLog(
			{
				entityType: 'news_item',
				entityId: id,
				action: 'create',
				payload: {
					sourceOrigin: input.isManual ? 'manual' : 'import',
					title: input.title,
					sourceId: input.sourceId
				}
			},
			context,
			client
		);
		const detail = await getNewsDetailQuery(id, client);
		if (!detail) throw new EmisError(500, 'NEWS_CREATE_FAILED', 'Failed to load created news item');
		return detail;
	});
}

export async function updateNewsService(
	id: string,
	patch: UpdateEmisNewsInput,
	context: EmisWriteContext
) {
	return withTransaction(async (client) => {
		if (!(await newsExists(id, client))) {
			throw new EmisError(404, 'NEWS_NOT_FOUND', 'News item not found');
		}
		await validateNewsReferences(patch, client);
		await updateNews(id, patch, context.actorId, client);
		await insertAuditLog(
			{
				entityType: 'news_item',
				entityId: id,
				action: 'update',
				payload: {
					patch
				}
			},
			context,
			client
		);
		const detail = await getNewsDetailQuery(id, client);
		if (!detail) throw new EmisError(500, 'NEWS_UPDATE_FAILED', 'Failed to load updated news item');
		return detail;
	});
}

export async function softDeleteNewsService(id: string, context: EmisWriteContext) {
	return withTransaction(async (client) => {
		const deleted = await softDeleteNews(id, context.actorId, client);
		if (!deleted) throw new EmisError(404, 'NEWS_NOT_FOUND', 'News item not found');
		await insertAuditLog(
			{
				entityType: 'news_item',
				entityId: id,
				action: 'delete'
			},
			context,
			client
		);
	});
}
