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
	mapLanguage: string | null;
	checkedAt: string;
};

export type EmisMapBBox = [number, number, number, number];

export type EmisMapFeatureKind = 'object' | 'news' | 'vessel';
export type EmisMapRouteFeatureKind = 'route-point' | 'route-segment';

export type EmisMapFeatureRef = {
	id: string;
	kind: EmisMapFeatureKind;
};

export type EmisMapRouteFeatureRef =
	| {
			kind: 'route-point';
			routePointId: number;
	  }
	| {
			kind: 'route-segment';
			segmentSeqShip: number;
	  };

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
	summary: string | null;
	url: string | null;
};

export type EmisMapObjectFeatureCollection = GeoJSON.FeatureCollection<
	GeoJSON.Point,
	EmisMapObjectFeatureProperties
>;

export type EmisMapNewsFeatureCollection = GeoJSON.FeatureCollection<
	GeoJSON.Point,
	EmisMapNewsFeatureProperties
>;

export type EmisMapSelectedFeature =
	| EmisMapObjectFeatureProperties
	| EmisMapNewsFeatureProperties
	| EmisMapVesselFeatureProperties;

export type EmisMapSelectedRoutePoint = {
	kind: 'route-point';
	routePointId: number;
	shipHbkId: number;
	vesselName: string;
	pointSeqShip: number;
	fetchedAt: string;
	latitude: number;
	longitude: number;
	speed: number | null;
	course: number | null;
	heading: number | null;
};

export type EmisMapSelectedRouteSegment = {
	kind: 'route-segment';
	shipHbkId: number;
	vesselName: string;
	segmentSeqShip: number;
	fromFetchedAt: string;
	fromLatitude: number;
	fromLongitude: number;
	toLatitude: number;
	toLongitude: number;
	gapMinutes: number | null;
	fromSpeed: number | null;
	fromCourse: number | null;
};

export type EmisMapSelectedRouteFeature = EmisMapSelectedRoutePoint | EmisMapSelectedRouteSegment;

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

export type EmisMapVesselsQueryInput = {
	bbox: EmisMapBBox;
	q?: string;
	limit?: number;
};

export type EmisMapVesselFeatureProperties = EmisMapFeatureBaseProperties & {
	kind: 'vessel';
	shipHbkId: number;
	imo: number | null;
	mmsi: number | null;
	flag: string | null;
	callsign: string | null;
	vesselType: string | null;
	lastFetchedAt: string;
	lastLatitude: number;
	lastLongitude: number;
	pointsCount: number;
	routeDaysCount: number;
};

export type EmisMapVesselFeatureCollection = GeoJSON.FeatureCollection<
	GeoJSON.Point,
	EmisMapVesselFeatureProperties
>;

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
