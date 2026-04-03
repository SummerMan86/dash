import type { PageServerLoad } from './$types';

import { getEmisMapConfig } from '@dashboard-builder/emis-server/infra/mapConfig';

export const load: PageServerLoad = async () => {
	return {
		mapConfig: await getEmisMapConfig()
	};
};
