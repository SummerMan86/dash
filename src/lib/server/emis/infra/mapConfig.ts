import { access, readdir } from 'node:fs/promises';
import path from 'node:path';

import type { EmisMapAssetStatus, EmisMapConfig, EmisMapMode } from '$entities/emis-map';

const OFFLINE_ASSET_ROOT_URL = '/emis-map/offline';
const OFFLINE_ASSET_DIR = path.resolve(process.cwd(), 'static', 'emis-map', 'offline');
const DEFAULT_OFFLINE_STYLE_URL = `${OFFLINE_ASSET_ROOT_URL}/style.json`;
const DEFAULT_OFFLINE_TILES_URL = `${OFFLINE_ASSET_ROOT_URL}/tiles/{z}/{x}/{y}.pbf`;
const DEFAULT_ONLINE_STYLE_URL = 'https://demotiles.maplibre.org/style.json';
const DEFAULT_INITIAL_CENTER: [number, number] = [30, 35];
const DEFAULT_INITIAL_ZOOM = 2.2;

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

function parseMode(value: string | undefined): EmisMapMode {
	return value === 'offline' ? 'offline' : 'online';
}

function parseCenter(value: string | undefined): [number, number] {
	if (!value) return DEFAULT_INITIAL_CENTER;

	const [lon, lat] = value
		.split(',')
		.map((part) => Number(part.trim()))
		.slice(0, 2);

	if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
		return DEFAULT_INITIAL_CENTER;
	}

	return [Math.max(-180, Math.min(180, lon)), Math.max(-90, Math.min(90, lat))];
}

function parseZoom(value: string | undefined): number {
	if (!value) return DEFAULT_INITIAL_ZOOM;
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return DEFAULT_INITIAL_ZOOM;
	return Math.max(0, Math.min(18, parsed));
}

async function getOfflineAssetStatus(): Promise<EmisMapAssetStatus> {
	return {
		style: await exists(path.join(OFFLINE_ASSET_DIR, 'style.json')),
		tiles: await hasVisibleEntries(path.join(OFFLINE_ASSET_DIR, 'tiles')),
		sprites: await hasVisibleEntries(path.join(OFFLINE_ASSET_DIR, 'sprites')),
		fonts: await hasVisibleEntries(path.join(OFFLINE_ASSET_DIR, 'fonts')),
		manifest: await exists(path.join(OFFLINE_ASSET_DIR, 'manifest.json'))
	};
}

function buildWarnings(assetStatus: EmisMapAssetStatus): string[] {
	const warnings: string[] = [];

	if (!assetStatus.style) warnings.push('Missing offline style.json bundle');
	if (!assetStatus.tiles) warnings.push('Missing offline tiles bundle');
	if (!assetStatus.sprites) warnings.push('Missing offline sprites bundle');
	if (!assetStatus.fonts) warnings.push('Missing offline fonts bundle');
	if (!assetStatus.manifest) warnings.push('Missing offline manifest.json');

	return warnings;
}

export async function getEmisMapConfig(): Promise<EmisMapConfig> {
	const requestedMode = parseMode(process.env.EMIS_MAP_MODE);
	const assetStatus = await getOfflineAssetStatus();
	const warnings = buildWarnings(assetStatus);
	const onlineStyleUrl =
		process.env.EMIS_MAP_STYLE_URL?.trim() ||
		process.env.EMIS_MAP_ONLINE_STYLE_URL?.trim() ||
		DEFAULT_ONLINE_STYLE_URL;
	const offlineStyleUrl =
		process.env.EMIS_MAP_OFFLINE_STYLE_URL?.trim() ||
		process.env.EMIS_MAP_STYLE_URL?.trim() ||
		DEFAULT_OFFLINE_STYLE_URL;
	const offlineTilesUrl = process.env.EMIS_MAP_TILES_URL?.trim() || DEFAULT_OFFLINE_TILES_URL;
	const initialCenter = parseCenter(process.env.EMIS_MAP_INITIAL_CENTER);
	const initialZoom = parseZoom(process.env.EMIS_MAP_INITIAL_ZOOM);
	const checkedAt = new Date().toISOString();

	if (requestedMode === 'offline') {
		if (assetStatus.style && assetStatus.tiles) {
			return {
				requestedMode,
				effectiveMode: 'offline',
				runtimeStatus: 'ready',
				source: 'offline-style',
				styleUrl: offlineStyleUrl,
				tilesUrl: offlineTilesUrl,
				assetRootUrl: OFFLINE_ASSET_ROOT_URL,
				statusMessage: 'Offline basemap bundle is installed and served from local static assets.',
				warnings,
				initialCenter,
				initialZoom,
				offlineAssets: assetStatus,
				checkedAt
			};
		}

		if (onlineStyleUrl) {
			return {
				requestedMode,
				effectiveMode: 'online',
				runtimeStatus: 'fallback-online',
				source: 'remote-style',
				styleUrl: onlineStyleUrl,
				tilesUrl: null,
				assetRootUrl: OFFLINE_ASSET_ROOT_URL,
				statusMessage:
					'Offline mode was requested, but the local bundle is incomplete. The map is using the online style as a controlled fallback.',
				warnings,
				initialCenter,
				initialZoom,
				offlineAssets: assetStatus,
				checkedAt
			};
		}

		return {
			requestedMode,
			effectiveMode: 'offline',
			runtimeStatus: 'missing-assets',
			source: 'none',
			styleUrl: null,
			tilesUrl: offlineTilesUrl,
			assetRootUrl: OFFLINE_ASSET_ROOT_URL,
			statusMessage:
				'Offline mode was requested, but local style or tiles are missing and no online fallback is configured.',
			warnings,
			initialCenter,
			initialZoom,
			offlineAssets: assetStatus,
			checkedAt
		};
	}

	if (!onlineStyleUrl) {
		return {
			requestedMode,
			effectiveMode: 'online',
			runtimeStatus: 'misconfigured',
			source: 'none',
			styleUrl: null,
			tilesUrl: null,
			assetRootUrl: OFFLINE_ASSET_ROOT_URL,
			statusMessage: 'Online map mode is enabled, but no style URL is configured.',
			warnings,
			initialCenter,
			initialZoom,
			offlineAssets: assetStatus,
			checkedAt
		};
	}

	return {
		requestedMode,
		effectiveMode: 'online',
		runtimeStatus: 'ready',
		source: onlineStyleUrl.startsWith('/') ? 'offline-style' : 'remote-style',
		styleUrl: onlineStyleUrl,
		tilesUrl: null,
		assetRootUrl: OFFLINE_ASSET_ROOT_URL,
		statusMessage: 'The map is using the configured online basemap style.',
		warnings,
		initialCenter,
		initialZoom,
		offlineAssets: assetStatus,
		checkedAt
	};
}
