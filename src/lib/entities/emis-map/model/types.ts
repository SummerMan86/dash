export type EmisMapMode = 'auto' | 'online' | 'offline';

export type EmisMapSource = 'auto' | 'online-style' | 'offline-pmtiles' | 'none';

export type EmisMapRuntimeStatus = 'ready' | 'degraded' | 'missing-assets' | 'misconfigured';

export type EmisMapOnlineProvider = 'maptiler' | 'custom' | 'demo' | 'none';

export type EmisMapAssetStatus = {
	pmtiles: boolean;
	sprites: boolean;
	fonts: boolean;
	manifest: boolean;
};

export type EmisMapOfflineManifest = {
	version: number | null;
	createdAt: string | null;
	source: string | null;
	bbox: EmisMapBBox | null;
	maxzoom: number | null;
	pmtiles: string[];
	fonts: string[];
	sprites: string[];
	notes: string | null;
};

export type EmisMapConfig = {
	requestedMode: EmisMapMode;
	effectiveMode: EmisMapMode;
	runtimeStatus: EmisMapRuntimeStatus;
	source: EmisMapSource;
	onlineProvider: EmisMapOnlineProvider;
	onlineStyleUrl: string | null;
	offlinePmtilesUrl: string | null;
	offlinePmtilesName: string | null;
	offlinePmtilesSources: EmisPmtilesFileInfo[];
	offlineSpriteUrl: string | null;
	offlineGlyphsUrl: string | null;
	offlineManifest: EmisMapOfflineManifest | null;
	autoFallbackEnabled: boolean;
	assetRootUrl: string;
	statusMessage: string;
	warnings: string[];
	initialCenter: [number, number];
	initialZoom: number;
	offlineAssets: EmisMapAssetStatus;
	checkedAt: string;
};

export type EmisMapBBox = [number, number, number, number];

export type EmisMapFeatureKind = 'object' | 'news';

type EmisMapFeatureBaseProperties = {
	id: string;
	kind: EmisMapFeatureKind;
	title: string;
	subtitle: string | null;
	colorKey: string;
};

export type EmisMapObjectFeatureProperties = EmisMapFeatureBaseProperties & {
	kind: 'object';
	objectTypeId: string;
	objectTypeCode: string;
	objectTypeName: string;
	countryCode: string | null;
	region: string | null;
	status: string;
	updatedAt: string;
};

export type EmisMapNewsFeatureProperties = EmisMapFeatureBaseProperties & {
	kind: 'news';
	sourceId: string;
	sourceName: string;
	countryCode: string | null;
	region: string | null;
	newsType: string | null;
	importance: number | null;
	publishedAt: string;
	relatedObjectsCount: number;
};

export type EmisMapObjectFeatureCollection = GeoJSON.FeatureCollection<
	GeoJSON.Point,
	EmisMapObjectFeatureProperties
>;

export type EmisMapNewsFeatureCollection = GeoJSON.FeatureCollection<
	GeoJSON.Point,
	EmisMapNewsFeatureProperties
>;

export type EmisMapObjectsQueryInput = {
	bbox: EmisMapBBox;
	q?: string;
	objectType?: string;
	country?: string;
	status?: string;
	limit?: number;
};

export type EmisMapNewsQueryInput = {
	bbox: EmisMapBBox;
	q?: string;
	source?: string;
	country?: string;
	newsType?: string;
	dateFrom?: string;
	dateTo?: string;
	objectId?: string;
	limit?: number;
};

export type EmisPmtilesFileInfo = {
	name: string;
	sizeBytes: number;
	url: string;
	maxzoom?: number;
};

export type EmisPmtilesSpikeStatus = {
	assetRootUrl: string;
	selectedPmtilesUrl: string | null;
	selectedPmtilesName: string | null;
	selectedSpriteUrl: string;
	selectedGlyphsUrl: string;
	localPmtilesFiles: EmisPmtilesFileInfo[];
	spritesReady: boolean;
	fontsReady: boolean;
	manifestReady: boolean;
	offlineCandidateReady: boolean;
	warnings: string[];
	checkedAt: string;
};
