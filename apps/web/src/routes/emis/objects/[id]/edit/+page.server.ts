import { error, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

import {
	createEmisObjectSchema,
	updateEmisObjectSchema
} from '@dashboard-builder/emis-contracts/emis-object';
import { assertWriteContext } from '$lib/server/emis/infra/writePolicy';
import { getObjectDetailQuery } from '$lib/server/emis/modules/objects/queries';
import { updateObjectService } from '$lib/server/emis/modules/objects/service';

import {
	actionFailure,
	ensureObjectFormRequired,
	loadObjectEditorDictionaries,
	objectDetailToFormValues,
	parseObjectForm,
	parseObjectFormWithoutGeometry,
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

	const geometryEditable = object.geometryType === 'Point';

	return {
		...dictionaries,
		object,
		geometryEditable,
		initialValues: objectDetailToFormValues(object)
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		const id = params.id;
		if (!id || !UUID_RE.test(id)) throw error(404, 'Object not found');

		const existing = await getObjectDetailQuery(id);
		if (!existing) throw error(404, 'Object not found');

		const isPointGeometry = existing.geometryType === 'Point';

		const formData = await request.formData();
		const values = readObjectFormValues(formData);

		let updated;
		try {
			if (isPointGeometry) {
				ensureObjectFormRequired(values);
				const payload = createEmisObjectSchema.parse(parseObjectForm(values));
				updated = await updateObjectService(
					id,
					payload,
					assertWriteContext(request, 'manual-ui', locals)
				);
			} else {
				const payload = updateEmisObjectSchema.parse(
					parseObjectFormWithoutGeometry(values)
				);
				updated = await updateObjectService(
					id,
					payload,
					assertWriteContext(request, 'manual-ui', locals)
				);
			}
		} catch (errorValue) {
			return actionFailure(errorValue, values);
		}

		throw redirect(303, `/emis/objects/${updated.id}`);
	}
};
