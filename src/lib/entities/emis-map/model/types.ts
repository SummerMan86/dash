export type EmisMapMode = 'online' | 'offline';

export type EmisMapSource = 'remote-style' | 'offline-style' | 'none';

export type EmisMapRuntimeStatus = 'ready' | 'fallback-online' | 'missing-assets' | 'misconfigured';

export type EmisMapAssetStatus = {
	style: boolean;
	tiles: boolean;
	sprites: boolean;
	fonts: boolean;
	manifest: boolean;
};

export type EmisMapConfig = {
	requestedMode: EmisMapMode;
	effectiveMode: EmisMapMode;
	runtimeStatus: EmisMapRuntimeStatus;
	source: EmisMapSource;
	styleUrl: string | null;
	tilesUrl: string | null;
	assetRootUrl: string;
	statusMessage: string;
	warnings: string[];
	initialCenter: [number, number];
	initialZoom: number;
	offlineAssets: EmisMapAssetStatus;
	checkedAt: string;
};
