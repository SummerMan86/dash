import { access, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import type { EmisMapBBox, EmisMapOfflineManifest, EmisPmtilesFileInfo } from '$entities/emis-map';

export const EMIS_OFFLINE_ASSET_ROOT_URL = '/emis-map/offline';
export const EMIS_OFFLINE_ASSET_DIR = path.resolve(process.cwd(), 'static', 'emis-map', 'offline');
export const EMIS_DEFAULT_GLYPHS_URL = `${EMIS_OFFLINE_ASSET_ROOT_URL}/fonts/{fontstack}/{range}.pbf`;

export type EmisPmtilesBundleStatus = {
	assetRootUrl: string;
	selectedPmtilesUrl: string | null;
	selectedPmtilesName: string | null;
	selectedSpriteUrl: string | null;
	selectedGlyphsUrl: string | null;
	localPmtilesFiles: EmisPmtilesFileInfo[];
	spritesReady: boolean;
	fontsReady: boolean;
	manifestReady: boolean;
	ready: boolean;
	manifest: EmisMapOfflineManifest | null;
	warnings: string[];
	checkedAt: string;
};

export async function pathExists(targetPath: string): Promise<boolean> {
	try {
		await access(targetPath);
		return true;
	} catch {
		return false;
	}
}

export async function hasVisibleEntries(targetPath: string): Promise<boolean> {
	try {
		const entries = await readdir(targetPath);
		return entries.some((entry) => !entry.startsWith('.'));
	} catch {
		return false;
	}
}

function parseManifestBbox(value: unknown): EmisMapBBox | null {
	if (typeof value !== 'string') return null;

	const parts = value
		.split(',')
		.map((part) => Number(part.trim()))
		.slice(0, 4);

	if (
		parts.length !== 4 ||
		parts.some((part) => !Number.isFinite(part)) ||
		parts[0] >= parts[2] ||
		parts[1] >= parts[3]
	) {
		return null;
	}

	return [parts[0], parts[1], parts[2], parts[3]];
}

type ManifestReadResult = {
	manifest: EmisMapOfflineManifest;
	maxzoomByFile: Map<string, number>;
};

async function readManifest(): Promise<ManifestReadResult | null> {
	const manifestPath = path.join(EMIS_OFFLINE_ASSET_DIR, 'manifest.json');
	if (!(await pathExists(manifestPath))) {
		return null;
	}

	try {
		const payload = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<string, unknown>;

		const rawPmtiles = Array.isArray(payload.pmtiles) ? payload.pmtiles : [];
		const maxzoomByFile = new Map<string, number>();
		const pmtiles: string[] = [];

		for (const item of rawPmtiles) {
			if (typeof item === 'string') {
				pmtiles.push(item);
			} else if (
				item &&
				typeof item === 'object' &&
				'file' in item &&
				typeof item.file === 'string'
			) {
				pmtiles.push(item.file);
				if ('maxzoom' in item && typeof item.maxzoom === 'number') {
					maxzoomByFile.set(item.file, item.maxzoom);
				}
			}
		}

		return {
			manifest: {
				version: typeof payload.version === 'number' ? payload.version : null,
				createdAt: typeof payload.createdAt === 'string' ? payload.createdAt : null,
				source: typeof payload.source === 'string' ? payload.source : null,
				bbox: parseManifestBbox(payload.bbox),
				maxzoom: typeof payload.maxzoom === 'number' ? payload.maxzoom : null,
				pmtiles,
				fonts: Array.isArray(payload.fonts)
					? payload.fonts.filter((f): f is string => typeof f === 'string')
					: [],
				sprites: Array.isArray(payload.sprites)
					? payload.sprites.filter((s): s is string => typeof s === 'string')
					: [],
				notes: typeof payload.notes === 'string' ? payload.notes : null
			},
			maxzoomByFile
		};
	} catch {
		return null;
	}
}

async function listLocalPmtilesFiles(): Promise<EmisPmtilesFileInfo[]> {
	try {
		const entries = await readdir(EMIS_OFFLINE_ASSET_DIR, { withFileTypes: true });
		const pmtilesFiles = entries.filter(
			(entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.pmtiles')
		);

		const files = await Promise.all(
			pmtilesFiles.map(async (entry) => {
				const filePath = path.join(EMIS_OFFLINE_ASSET_DIR, entry.name);
				const fileStat = await stat(filePath);
				return {
					name: entry.name,
					sizeBytes: fileStat.size,
					url: `${EMIS_OFFLINE_ASSET_ROOT_URL}/${entry.name}`
				};
			})
		);

		return files.sort((left, right) => left.name.localeCompare(right.name));
	} catch {
		return [];
	}
}

async function resolveSpriteUrl(): Promise<string | null> {
	const candidates = [
		{
			checkPath: path.join(EMIS_OFFLINE_ASSET_DIR, 'sprites', 'v4', 'light.json'),
			url: `${EMIS_OFFLINE_ASSET_ROOT_URL}/sprites/v4/light`
		},
		{
			checkPath: path.join(EMIS_OFFLINE_ASSET_DIR, 'sprites', 'light.json'),
			url: `${EMIS_OFFLINE_ASSET_ROOT_URL}/sprites/light`
		},
		{
			checkPath: path.join(EMIS_OFFLINE_ASSET_DIR, 'sprites', 'sprite.json'),
			url: `${EMIS_OFFLINE_ASSET_ROOT_URL}/sprites/sprite`
		}
	];

	for (const candidate of candidates) {
		if (await pathExists(candidate.checkPath)) {
			return candidate.url;
		}
	}

	return null;
}

export function deriveCenterFromBbox(bbox: EmisMapBBox): [number, number] {
	return [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
}

export function deriveZoomFromBbox(
	bbox: EmisMapBBox,
	maxZoom: number | null,
	fallback = 5
): number {
	const span = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1]);
	const targetMaxZoom = typeof maxZoom === 'number' ? maxZoom : fallback;

	if (span <= 0.7) return Math.min(targetMaxZoom, 9);
	if (span <= 3) return Math.min(targetMaxZoom, 7);
	if (span <= 10) return Math.min(targetMaxZoom, 5);
	return Math.min(targetMaxZoom, fallback);
}

export async function getEmisPmtilesBundleStatus(): Promise<EmisPmtilesBundleStatus> {
	const [
		localPmtilesFiles,
		spritesReady,
		fontsReady,
		manifestReady,
		selectedSpriteUrl,
		manifestResult
	] = await Promise.all([
		listLocalPmtilesFiles(),
		hasVisibleEntries(path.join(EMIS_OFFLINE_ASSET_DIR, 'sprites')),
		hasVisibleEntries(path.join(EMIS_OFFLINE_ASSET_DIR, 'fonts')),
		pathExists(path.join(EMIS_OFFLINE_ASSET_DIR, 'manifest.json')),
		resolveSpriteUrl(),
		readManifest()
	]);

	const manifest = manifestResult?.manifest ?? null;
	const maxzoomByFile = manifestResult?.maxzoomByFile ?? new Map<string, number>();

	// Enrich files with per-file maxzoom from manifest
	const enrichedFiles = localPmtilesFiles.map((f) => ({
		...f,
		maxzoom: maxzoomByFile.get(f.name) ?? manifest?.maxzoom ?? undefined
	}));

	const selectedPmtiles =
		manifest?.pmtiles
			.map((name) => enrichedFiles.find((file) => file.name === name) ?? null)
			.find((file) => file !== null) ??
		enrichedFiles[0] ??
		null;
	const ready =
		Boolean(selectedPmtiles) &&
		Boolean(selectedSpriteUrl) &&
		spritesReady &&
		fontsReady &&
		manifestReady &&
		Boolean(manifest);
	const warnings: string[] = [];

	if (!selectedPmtiles) {
		warnings.push('No local .pmtiles file found in static/emis-map/offline');
	}
	if (!spritesReady) {
		warnings.push('Missing local sprites assets for offline PMTiles runtime');
	} else if (!selectedSpriteUrl) {
		warnings.push('Sprites directory exists, but no compatible sprite manifest was found');
	}
	if (!fontsReady) {
		warnings.push('Missing local fonts assets for offline PMTiles runtime');
	}
	if (!manifestReady) {
		warnings.push('Missing manifest.json in static/emis-map/offline');
	}
	if (manifestReady && !manifest) {
		warnings.push('manifest.json exists but could not be parsed');
	}
	if (
		manifest?.pmtiles.length &&
		selectedPmtiles &&
		!manifest.pmtiles.includes(selectedPmtiles.name)
	) {
		warnings.push(
			`Selected PMTiles archive "${selectedPmtiles.name}" is not listed in manifest.json`
		);
	}

	return {
		assetRootUrl: EMIS_OFFLINE_ASSET_ROOT_URL,
		selectedPmtilesUrl: selectedPmtiles?.url ?? null,
		selectedPmtilesName: selectedPmtiles?.name ?? null,
		selectedSpriteUrl,
		selectedGlyphsUrl: fontsReady ? EMIS_DEFAULT_GLYPHS_URL : null,
		localPmtilesFiles: enrichedFiles,
		spritesReady,
		fontsReady,
		manifestReady,
		ready,
		manifest,
		warnings,
		checkedAt: new Date().toISOString()
	};
}
