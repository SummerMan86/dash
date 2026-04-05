import { error, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

import { attachNewsObjectsSchema } from '@dashboard-builder/emis-contracts/emis-link';
import { createEmisNewsSchema } from '@dashboard-builder/emis-contracts/emis-news';
import { assertWriteContext } from '$lib/server/emis/infra/writePolicy';
import {
	attachNewsObjectsService,
	deleteNewsObjectLinkService
} from '$lib/server/emis/modules/links/service';
import { getNewsDetailQuery } from '$lib/server/emis/modules/news/queries';
import { updateNewsService } from '$lib/server/emis/modules/news/service';

import {
	actionFailure,
	ensureNewsFormRequired,
	loadNewsEditorDictionaries,
	newsDetailToFormValues,
	parseNewsForm,
	readNewsFormValues
} from '../../../manual-entry.server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalText(formData: FormData, key: string) {
	const value = formData.get(key);
	return typeof value === 'string' ? value.trim() : '';
}

export const load: PageServerLoad = async ({ params }) => {
	const id = params.id;
	if (!id || !UUID_RE.test(id)) throw error(404, 'News item not found');

	const [news, dictionaries] = await Promise.all([
		getNewsDetailQuery(id),
		loadNewsEditorDictionaries()
	]);
	if (!news) throw error(404, 'News item not found');

	return {
		...dictionaries,
		news,
		initialValues: newsDetailToFormValues(news)
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const id = params.id;
		if (!id || !UUID_RE.test(id)) throw error(404, 'News item not found');

		const formData = await request.formData();
		const values = readNewsFormValues(formData);

		let updated;
		try {
			ensureNewsFormRequired(values);
			const payload = createEmisNewsSchema.parse(parseNewsForm(values));
			updated = await updateNewsService(id, payload, assertWriteContext(request, 'manual-ui'));
		} catch (errorValue) {
			return actionFailure(errorValue, values);
		}

		throw redirect(303, `/emis/news/${updated.id}`);
	},
	attachLink: async ({ request, params }) => {
		const id = params.id;
		if (!id || !UUID_RE.test(id)) throw error(404, 'News item not found');

		const formData = await request.formData();
		const objectId = optionalText(formData, 'objectId');
		const linkType = optionalText(formData, 'linkType') || 'mentioned';
		const comment = optionalText(formData, 'comment');
		const confidenceRaw = optionalText(formData, 'confidence');
		const isPrimary = formData.get('isPrimary') !== null;

		try {
			const payload = attachNewsObjectsSchema.parse({
				links: [
					{
						objectId,
						linkType,
						isPrimary,
						confidence: confidenceRaw ? Number(confidenceRaw) : null,
						comment: comment || null
					}
				]
			});
			await attachNewsObjectsService(id, payload, assertWriteContext(request, 'manual-ui'));
		} catch (errorValue) {
			return actionFailure(
				errorValue,
				{ objectId, linkType, comment, confidence: confidenceRaw, isPrimary },
				'attachLink'
			);
		}

		throw redirect(303, `/emis/news/${id}/edit`);
	},
	deleteLink: async ({ request, params }) => {
		const id = params.id;
		if (!id || !UUID_RE.test(id)) throw error(404, 'News item not found');

		const formData = await request.formData();
		const objectId = optionalText(formData, 'objectId');

		if (!objectId) {
			return actionFailure(new Error('Object UUID is required'), { objectId }, 'deleteLink');
		}

		try {
			await deleteNewsObjectLinkService(id, objectId, assertWriteContext(request, 'manual-ui'));
		} catch (errorValue) {
			return actionFailure(errorValue, { objectId }, 'deleteLink');
		}

		throw redirect(303, `/emis/news/${id}/edit`);
	}
};
