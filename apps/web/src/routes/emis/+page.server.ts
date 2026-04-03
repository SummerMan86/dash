import type { PageServerLoad } from './$types';

import { getEmisMapConfig } from '$lib/server/emis/infra/mapConfig';

export const load: PageServerLoad = async () => {
	return {
		mapConfig: await getEmisMapConfig()
	};
};
