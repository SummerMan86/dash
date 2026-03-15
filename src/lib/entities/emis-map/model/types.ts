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
