// MIGRATION: re-export from @dashboard-builder/emis-contracts
export type {
	EmisMapMode,
	EmisMapSource,
	EmisMapRuntimeStatus,
	EmisMapOnlineProvider,
	EmisMapAssetStatus,
	EmisMapOfflineManifest,
	EmisMapConfig,
	EmisMapBBox,
	EmisMapFeatureKind,
	EmisMapFeatureRef,
	EmisMapRouteFeatureKind,
	EmisMapRouteFeatureRef,
	EmisMapObjectFeatureProperties,
	EmisMapNewsFeatureProperties,
	EmisMapVesselFeatureProperties,
	EmisMapObjectFeatureCollection,
	EmisMapNewsFeatureCollection,
	EmisMapVesselFeatureCollection,
	EmisMapSelectedFeature,
	EmisMapSelectedRoutePoint,
	EmisMapSelectedRouteSegment,
	EmisMapSelectedRouteFeature,
	EmisMapObjectsQueryInput,
	EmisMapNewsQueryInput,
	EmisMapVesselsQueryInput,
	EmisPmtilesFileInfo,
	EmisPmtilesSpikeStatus
} from '@dashboard-builder/emis-contracts/emis-map';
export {
	mapBboxSchema,
	mapObjectsQuerySchema,
	mapNewsQuerySchema,
	mapVesselsQuerySchema,
	type MapObjectsQuerySchemaInput,
	type MapNewsQuerySchemaInput,
	type MapVesselsQuerySchemaInput
} from '@dashboard-builder/emis-contracts/emis-map';
