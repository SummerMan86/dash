import { redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

import { createEmisObjectSchema } from '$entities/emis-object';
import { assertWriteContext } from '$lib/server/emis/infra/writePolicy';
import { createObjectService } from '$lib/server/emis/modules/objects/service';

import {
	actionFailure,
	createObjectFormDefaults,
	ensureObjectFormRequired,
	loadObjectEditorDictionaries,
	parseObjectForm,
	readObjectFormValues
} from '../../manual-entry.server';

export const load: PageServerLoad = async () => {
	const dictionaries = await loadObjectEditorDictionaries();

	return {
		...dictionaries,
		initialValues: createObjectFormDefaults()
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const values = readObjectFormValues(formData);

		let created;
		try {
			ensureObjectFormRequired(values);
			const payload = createEmisObjectSchema.parse(parseObjectForm(values));
			created = await createObjectService(payload, assertWriteContext(request, 'manual-ui'));
		} catch (error) {
			return actionFailure(error, values);
		}

		throw redirect(303, `/emis/objects/${created.id}`);
	}
};
