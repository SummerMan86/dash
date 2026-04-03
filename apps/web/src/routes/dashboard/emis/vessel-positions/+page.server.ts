import type { PageServerLoad } from './$types';

// eslint-disable-next-line no-restricted-imports -- known gap: mapConfig is shared infra, resolves when map config extracts to platform package
import { getEmisMapConfig } from '$lib/server/emis/infra/mapConfig';

export const load: PageServerLoad = async () => {
	return {
		mapConfig: await getEmisMapConfig()
	};
};
