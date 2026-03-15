import { access, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import type { EmisPmtilesFileInfo, EmisPmtilesSpikeStatus } from '$entities/emis-map';

const OFFLINE_ASSET_ROOT_URL = '/emis-map/offline';
const OFFLINE_ASSET_DIR = path.resolve(process.cwd(), 'static', 'emis-map', 'offline');
const DEFAULT_GLYPHS_URL = `${OFFLINE_ASSET_ROOT_URL}/fonts/{fontstack}/{range}.pbf`;

async function exists(targetPath: string): Promise<boolean> {
	try {
		await access(targetPath);
		return true;
	} catch {
		return false;
	}
}

async function hasVisibleEntries(targetPath: string): Promise<boolean> {
	try {
		const entries = await readdir(targetPath);
		return entries.some((entry) => !entry.startsWith('.'));
	} catch {
		return false;
	}
}

async function listLocalPmtilesFiles(): Promise<EmisPmtilesFileInfo[]> {
	try {
		const entries = await readdir(OFFLINE_ASSET_DIR, { withFileTypes: true });
		const pmtilesFiles = entries.filter(
			(entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.pmtiles')
		);

		const files = await Promise.all(
			pmtilesFiles.map(async (entry) => {
				const filePath = path.join(OFFLINE_ASSET_DIR, entry.name);
				const fileStat = await stat(filePath);
				return {
					name: entry.name,
					sizeBytes: fileStat.size,
					url: `${OFFLINE_ASSET_ROOT_URL}/${entry.name}`
				};
			})
		);

		return files.sort((left, right) => left.name.localeCompare(right.name));
	} catch {
		return [];
	}
}

async function resolveSpriteUrl(): Promise<string> {
	const candidates = [
		{
			checkPath: path.join(OFFLINE_ASSET_DIR, 'sprites', 'v4', 'light.json'),
			url: `${OFFLINE_ASSET_ROOT_URL}/sprites/v4/light`
		},
		{
			checkPath: path.join(OFFLINE_ASSET_DIR, 'sprites', 'light.json'),
			url: `${OFFLINE_ASSET_ROOT_URL}/sprites/light`
		},
		{
			checkPath: path.join(OFFLINE_ASSET_DIR, 'sprites', 'sprite.json'),
			url: `${OFFLINE_ASSET_ROOT_URL}/sprites/sprite`
		}
	];

	for (const candidate of candidates) {
		if (await exists(candidate.checkPath)) {
			return candidate.url;
		}
	}

	return `${OFFLINE_ASSET_ROOT_URL}/sprites/v4/light`;
}

export async function getEmisPmtilesSpikeStatus(): Promise<EmisPmtilesSpikeStatus> {
	const [localPmtilesFiles, spritesReady, fontsReady, manifestReady, selectedSpriteUrl] =
		await Promise.all([
			listLocalPmtilesFiles(),
			hasVisibleEntries(path.join(OFFLINE_ASSET_DIR, 'sprites')),
			hasVisibleEntries(path.join(OFFLINE_ASSET_DIR, 'fonts')),
			exists(path.join(OFFLINE_ASSET_DIR, 'manifest.json')),
			resolveSpriteUrl()
		]);

	const selectedPmtiles = localPmtilesFiles[0] ?? null;
	const offlineCandidateReady = Boolean(selectedPmtiles) && spritesReady && fontsReady;
	const warnings: string[] = [];

	if (!selectedPmtiles) {
		warnings.push('No local .pmtiles file found in static/emis-map/offline');
	}
	if (!spritesReady) {
		warnings.push('Missing local sprites assets for PMTiles spike');
	}
	if (!fontsReady) {
		warnings.push('Missing local fonts assets for PMTiles spike');
	}
	if (!manifestReady) {
		warnings.push('Missing manifest.json in static/emis-map/offline');
	}

	return {
		assetRootUrl: OFFLINE_ASSET_ROOT_URL,
		selectedPmtilesUrl: selectedPmtiles?.url ?? null,
		selectedPmtilesName: selectedPmtiles?.name ?? null,
		selectedSpriteUrl,
		selectedGlyphsUrl: DEFAULT_GLYPHS_URL,
		localPmtilesFiles,
		spritesReady,
		fontsReady,
		manifestReady,
		offlineCandidateReady,
		warnings,
		checkedAt: new Date().toISOString()
	};
}
