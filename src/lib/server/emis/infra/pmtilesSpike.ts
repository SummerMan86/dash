import type { EmisPmtilesSpikeStatus } from '$entities/emis-map';

import { getEmisPmtilesBundleStatus } from './pmtilesBundle';

export async function getEmisPmtilesSpikeStatus(): Promise<EmisPmtilesSpikeStatus> {
	const bundleStatus = await getEmisPmtilesBundleStatus();

	return {
		assetRootUrl: bundleStatus.assetRootUrl,
		selectedPmtilesUrl: bundleStatus.selectedPmtilesUrl,
		selectedPmtilesName: bundleStatus.selectedPmtilesName,
		selectedSpriteUrl:
			bundleStatus.selectedSpriteUrl ?? `${bundleStatus.assetRootUrl}/sprites/v4/light`,
		selectedGlyphsUrl:
			bundleStatus.selectedGlyphsUrl ??
			`${bundleStatus.assetRootUrl}/fonts/{fontstack}/{range}.pbf`,
		localPmtilesFiles: bundleStatus.localPmtilesFiles,
		spritesReady: bundleStatus.spritesReady,
		fontsReady: bundleStatus.fontsReady,
		manifestReady: bundleStatus.manifestReady,
		offlineCandidateReady: bundleStatus.ready,
		warnings: bundleStatus.warnings,
		checkedAt: bundleStatus.checkedAt
	};
}
