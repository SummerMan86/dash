import { redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

import { createEmisNewsSchema } from '$entities/emis-news';
import { resolveEmisWriteContext } from '$lib/server/emis/infra/audit';
import { createNewsService } from '$lib/server/emis/modules/news/service';

import {
	actionFailure,
	createNewsFormDefaults,
	ensureNewsFormRequired,
	loadNewsEditorDictionaries,
	parseNewsForm,
	readNewsFormValues
} from '../../manual-entry.server';

export const load: PageServerLoad = async () => {
	const dictionaries = await loadNewsEditorDictionaries();

	return {
		...dictionaries,
		initialValues: createNewsFormDefaults()
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const values = readNewsFormValues(formData);

		let created;
		try {
			ensureNewsFormRequired(values);
			const payload = createEmisNewsSchema.parse(parseNewsForm(values));
			created = await createNewsService(payload, resolveEmisWriteContext(request, 'manual-ui'));
		} catch (error) {
			return actionFailure(error, values);
		}

		throw redirect(303, `/emis/news/${created.id}`);
	}
};
