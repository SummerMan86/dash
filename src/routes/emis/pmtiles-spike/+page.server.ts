import type { PageServerLoad } from './$types';

import { getEmisMapConfig } from '$lib/server/emis/infra/mapConfig';
import { getEmisPmtilesSpikeStatus } from '$lib/server/emis/infra/pmtilesSpike';

export const load: PageServerLoad = async ({ url }) => {
	const [mapConfig, pmtilesSpike] = await Promise.all([
		getEmisMapConfig(),
		getEmisPmtilesSpikeStatus()
	]);

	const rangeProbeUrl = pmtilesSpike.selectedPmtilesUrl
		? `${url.origin}${pmtilesSpike.selectedPmtilesUrl}`
		: null;

	return {
		mapConfig,
		pmtilesSpike,
		rangeProbeUrl,
		rangeProbeCommand: rangeProbeUrl ? `pnpm map:pmtiles:probe -- --url ${rangeProbeUrl}` : null,
		rangeCurlCommand: rangeProbeUrl ? `curl -I -H 'Range: bytes=0-9' ${rangeProbeUrl}` : null
	};
};
