import type { PoolClient } from 'pg';

import type { CreateEmisNewsInput, UpdateEmisNewsInput } from '$entities/emis-news';

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

export async function createNewsService(input: CreateEmisNewsInput) {
	return withTransaction(async (client) => {
		await validateNewsReferences(input, client);
		const id = await insertNews(input, client);
		const detail = await getNewsDetailQuery(id);
		if (!detail) throw new EmisError(500, 'NEWS_CREATE_FAILED', 'Failed to load created news item');
		return detail;
	});
}

export async function updateNewsService(id: string, patch: UpdateEmisNewsInput) {
	return withTransaction(async (client) => {
		if (!(await newsExists(id, client))) {
			throw new EmisError(404, 'NEWS_NOT_FOUND', 'News item not found');
		}
		await validateNewsReferences(patch, client);
		await updateNews(id, patch, client);
		const detail = await getNewsDetailQuery(id);
		if (!detail) throw new EmisError(500, 'NEWS_UPDATE_FAILED', 'Failed to load updated news item');
		return detail;
	});
}

export async function softDeleteNewsService(id: string) {
	const deleted = await softDeleteNews(id);
	if (!deleted) throw new EmisError(404, 'NEWS_NOT_FOUND', 'News item not found');
}
