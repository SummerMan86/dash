// MIGRATION: re-export from @dashboard-builder/emis-server
export {
	EMIS_DEFAULT_LIST_LIMIT,
	EMIS_MAX_LIST_LIMIT,
	EMIS_DEFAULT_MAP_LIMIT,
	EMIS_MAX_MAP_LIMIT,
	EMIS_DEFAULT_SHIP_ROUTE_VESSELS_LIMIT,
	EMIS_MAX_SHIP_ROUTE_VESSELS_LIMIT,
	EMIS_DEFAULT_SHIP_ROUTE_GEOMETRY_LIMIT,
	EMIS_MAX_SHIP_ROUTE_GEOMETRY_LIMIT,
	EMIS_MAX_OFFSET,
	parseJsonBody,
	requireUuid,
	parseIntParam,
	parseStrictIntParam,
	parseListParams,
	parseOptionalStrictInt,
	normalizeDateTimeParam,
	buildEmisListMeta,
	jsonEmisList,
	jsonEmisError,
	handleEmisRoute
} from '@dashboard-builder/emis-server/infra/http';
export type { EmisSortRule, EmisListMeta } from '@dashboard-builder/emis-server/infra/http';
