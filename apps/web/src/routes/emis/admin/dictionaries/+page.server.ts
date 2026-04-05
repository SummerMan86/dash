import type { PageServerLoad } from './$types';

import {
	listCountries,
	listObjectTypes,
	listSources
} from '@dashboard-builder/emis-server/modules/dictionaries/repository';

export const load: PageServerLoad = async () => {
	const [countries, objectTypes, sources] = await Promise.all([
		listCountries(),
		listObjectTypes(),
		listSources()
	]);

	return { countries, objectTypes, sources };
};
