import { error, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

import { createEmisObjectSchema } from '$entities/emis-object';
import { resolveEmisWriteContext } from '$lib/server/emis/infra/audit';
import { getObjectDetailQuery } from '$lib/server/emis/modules/objects/queries';
import { updateObjectService } from '$lib/server/emis/modules/objects/service';

import {
	actionFailure,
	ensureObjectFormRequired,
	loadObjectEditorDictionaries,
	objectDetailToFormValues,
	parseObjectForm,
	readObjectFormValues
} from '../../../manual-entry.server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const load: PageServerLoad = async ({ params }) => {
	const id = params.id;
	if (!id || !UUID_RE.test(id)) throw error(404, 'Object not found');

	const [object, dictionaries] = await Promise.all([
		getObjectDetailQuery(id),
		loadObjectEditorDictionaries()
	]);
	if (!object) throw error(404, 'Object not found');

	return {
		...dictionaries,
		object,
		initialValues: objectDetailToFormValues(object)
	};
};

export const actions: Actions = {
	default: async ({ request, params }) => {
		const id = params.id;
		if (!id || !UUID_RE.test(id)) throw error(404, 'Object not found');

		const formData = await request.formData();
		const values = readObjectFormValues(formData);

		let updated;
		try {
			ensureObjectFormRequired(values);
			const payload = createEmisObjectSchema.parse(parseObjectForm(values));
			updated = await updateObjectService(
				id,
				payload,
				resolveEmisWriteContext(request, 'manual-ui')
			);
		} catch (errorValue) {
			return actionFailure(errorValue, values);
		}

		throw redirect(303, `/emis/objects/${updated.id}`);
	}
};
