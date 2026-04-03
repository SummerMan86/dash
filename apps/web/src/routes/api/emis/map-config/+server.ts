import { json } from '@sveltejs/kit';

import { handleEmisRoute } from '$lib/server/emis/infra/http';
import { getEmisMapConfig } from '@dashboard-builder/emis-server/infra/mapConfig';

export const GET = handleEmisRoute(async () => {
	const config = await getEmisMapConfig();
	return json(config);
}, 'Unable to resolve EMIS map configuration');
