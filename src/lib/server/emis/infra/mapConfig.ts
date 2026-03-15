import type {
	EmisMapBBox,
	EmisMapConfig,
	EmisMapMode,
	EmisMapOnlineProvider
} from '$entities/emis-map';

import {
	EMIS_OFFLINE_ASSET_ROOT_URL,
	deriveCenterFromBbox,
	deriveZoomFromBbox,
	getEmisPmtilesBundleStatus
} from './pmtilesBundle';

const DEFAULT_ONLINE_STYLE_URL = 'https://demotiles.maplibre.org/style.json';
const DEFAULT_MAPTILER_STYLE_ID = 'streets-v2';
const DEFAULT_INITIAL_CENTER: [number, number] = [30, 35];
const DEFAULT_INITIAL_ZOOM = 2.2;

function parseMode(value: string | undefined): EmisMapMode {
	if (value === 'online' || value === 'offline') return value;
	return 'auto';
}

function parseCenter(value: string | undefined): [number, number] | null {
	if (!value) return null;

	const [lon, lat] = value
		.split(',')
		.map((part) => Number(part.trim()))
		.slice(0, 2);

	if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
		return null;
	}

	return [Math.max(-180, Math.min(180, lon)), Math.max(-90, Math.min(90, lat))];
}

function parseZoom(value: string | undefined): number | null {
	if (!value) return null;
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return null;
	return Math.max(0, Math.min(18, parsed));
}

function resolveOnlineConfig(): {
	provider: EmisMapOnlineProvider;
	styleUrl: string | null;
	warnings: string[];
} {
	const explicitStyle =
		process.env.EMIS_MAP_ONLINE_STYLE_URL?.trim() || process.env.EMIS_MAP_STYLE_URL?.trim();
	if (explicitStyle) {
		return {
			provider: explicitStyle.includes('api.maptiler.com') ? 'maptiler' : 'custom',
			styleUrl: explicitStyle,
			warnings: []
		};
	}

	const mapTilerKey = process.env.EMIS_MAPTILER_KEY?.trim() || process.env.MAPTILER_KEY?.trim();
	if (mapTilerKey) {
		const styleId = process.env.EMIS_MAPTILER_STYLE_ID?.trim() || DEFAULT_MAPTILER_STYLE_ID;
		return {
			provider: 'maptiler',
			styleUrl: `https://api.maptiler.com/maps/${styleId}/style.json?key=${mapTilerKey}`,
			warnings: []
		};
	}

	return {
		provider: 'demo',
		styleUrl: DEFAULT_ONLINE_STYLE_URL,
		warnings: [
			'EMIS_MAPTILER_KEY is not configured; using the demo online style instead of MapTiler.'
		]
	};
}

function resolveInitialView(
	requestedMode: EmisMapMode,
	offlineManifestBbox: EmisMapBBox | null,
	offlineMaxZoom: number | null
) {
	const envCenter = parseCenter(process.env.EMIS_MAP_INITIAL_CENTER);
	const envZoom = parseZoom(process.env.EMIS_MAP_INITIAL_ZOOM);

	const fallbackCenter =
		requestedMode !== 'online' && offlineManifestBbox
			? deriveCenterFromBbox(offlineManifestBbox)
			: DEFAULT_INITIAL_CENTER;
	const fallbackZoom =
		requestedMode !== 'online' && offlineManifestBbox
			? deriveZoomFromBbox(offlineManifestBbox, offlineMaxZoom, DEFAULT_INITIAL_ZOOM)
			: DEFAULT_INITIAL_ZOOM;

	return {
		initialCenter: envCenter ?? fallbackCenter,
		initialZoom: envZoom ?? fallbackZoom
	};
}

function buildConfig({
	requestedMode,
	effectiveMode,
	runtimeStatus,
	source,
	onlineProvider,
	onlineStyleUrl,
	offlinePmtilesUrl,
	offlinePmtilesName,
	offlinePmtilesSources,
	offlineSpriteUrl,
	offlineGlyphsUrl,
	offlineManifest,
	autoFallbackEnabled,
	statusMessage,
	warnings,
	initialCenter,
	initialZoom,
	offlineAssets,
	checkedAt
}: Omit<EmisMapConfig, 'assetRootUrl'>): EmisMapConfig {
	return {
		requestedMode,
		effectiveMode,
		runtimeStatus,
		source,
		onlineProvider,
		onlineStyleUrl,
		offlinePmtilesUrl,
		offlinePmtilesName,
		offlinePmtilesSources,
		offlineSpriteUrl,
		offlineGlyphsUrl,
		offlineManifest,
		autoFallbackEnabled,
		assetRootUrl: EMIS_OFFLINE_ASSET_ROOT_URL,
		statusMessage,
		warnings,
		initialCenter,
		initialZoom,
		offlineAssets,
		checkedAt
	};
}

function describeOnlineProvider(provider: EmisMapOnlineProvider): string {
	if (provider === 'maptiler') return 'MapTiler';
	if (provider === 'custom') return 'custom online style';
	if (provider === 'demo') return 'demo online style';
	return 'online style';
}

export async function getEmisMapConfig(): Promise<EmisMapConfig> {
	const requestedMode = parseMode(process.env.EMIS_MAP_MODE);
	const bundleStatus = await getEmisPmtilesBundleStatus();
	const onlineConfig = resolveOnlineConfig();
	const checkedAt = new Date().toISOString();
	const warnings = [
		...bundleStatus.warnings,
		...(requestedMode === 'offline' ? [] : onlineConfig.warnings)
	];
	const offlineReady = bundleStatus.ready;
	const onlineReady = Boolean(onlineConfig.styleUrl);
	const { initialCenter, initialZoom } = resolveInitialView(
		requestedMode,
		bundleStatus.manifest?.bbox ?? null,
		bundleStatus.manifest?.maxzoom ?? null
	);
	const offlineAssets = {
		pmtiles: Boolean(bundleStatus.selectedPmtilesUrl),
		sprites: bundleStatus.spritesReady,
		fonts: bundleStatus.fontsReady,
		manifest: bundleStatus.manifestReady && Boolean(bundleStatus.manifest)
	};

	const shared = {
		onlineProvider: onlineConfig.provider,
		onlineStyleUrl: onlineConfig.styleUrl,
		offlinePmtilesUrl: bundleStatus.selectedPmtilesUrl,
		offlinePmtilesName: bundleStatus.selectedPmtilesName,
		offlinePmtilesSources: bundleStatus.localPmtilesFiles,
		offlineSpriteUrl: bundleStatus.selectedSpriteUrl,
		offlineGlyphsUrl: bundleStatus.selectedGlyphsUrl,
		offlineManifest: bundleStatus.manifest,
		warnings,
		initialCenter,
		initialZoom,
		offlineAssets,
		checkedAt
	};

	if (requestedMode === 'offline') {
		if (offlineReady) {
			return buildConfig({
				requestedMode,
				effectiveMode: 'offline',
				runtimeStatus: 'ready',
				source: 'offline-pmtiles',
				autoFallbackEnabled: false,
				statusMessage: 'Offline PMTiles bundle is installed and served from local static assets.',
				...shared
			});
		}

		return buildConfig({
			requestedMode,
			effectiveMode: 'offline',
			runtimeStatus: 'missing-assets',
			source: 'none',
			autoFallbackEnabled: false,
			statusMessage:
				'Offline mode was requested, but the local PMTiles bundle is incomplete or missing.',
			...shared
		});
	}

	if (requestedMode === 'online') {
		if (onlineReady) {
			return buildConfig({
				requestedMode,
				effectiveMode: 'online',
				runtimeStatus: 'ready',
				source: 'online-style',
				autoFallbackEnabled: false,
				statusMessage: `Online mode is using ${describeOnlineProvider(onlineConfig.provider)}.`,
				...shared
			});
		}

		return buildConfig({
			requestedMode,
			effectiveMode: 'online',
			runtimeStatus: 'misconfigured',
			source: 'none',
			autoFallbackEnabled: false,
			statusMessage:
				'Online mode was requested, but no online basemap style is configured for the client.',
			...shared
		});
	}

	if (onlineReady && offlineReady) {
		return buildConfig({
			requestedMode,
			effectiveMode: 'auto',
			runtimeStatus: 'ready',
			source: 'auto',
			autoFallbackEnabled: true,
			statusMessage:
				'Auto mode will start with the online basemap and switch once to local PMTiles if startup fails.',
			...shared
		});
	}

	if (onlineReady) {
		return buildConfig({
			requestedMode,
			effectiveMode: 'online',
			runtimeStatus: 'degraded',
			source: 'online-style',
			autoFallbackEnabled: false,
			statusMessage:
				'Auto mode is running online-only because the local PMTiles bundle is not fully ready yet.',
			...shared
		});
	}

	if (offlineReady) {
		return buildConfig({
			requestedMode,
			effectiveMode: 'offline',
			runtimeStatus: 'degraded',
			source: 'offline-pmtiles',
			autoFallbackEnabled: false,
			statusMessage:
				'Auto mode is starting directly in local offline mode because the online basemap is unavailable.',
			...shared
		});
	}

	return buildConfig({
		requestedMode,
		effectiveMode: 'auto',
		runtimeStatus: 'misconfigured',
		source: 'none',
		autoFallbackEnabled: false,
		statusMessage:
			'Auto mode has neither a working online basemap style nor a complete local PMTiles bundle.',
		...shared
	});
}
