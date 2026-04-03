import { json, type RequestHandler } from '@sveltejs/kit';
import { isEmisError } from '@dashboard-builder/emis-server/infra/errors';
import { buildEmisListMeta, type EmisSortRule } from '@dashboard-builder/emis-server/infra/http';

// Re-export framework-agnostic helpers from package
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
	buildEmisListMeta
} from '@dashboard-builder/emis-server/infra/http';
export type { EmisSortRule, EmisListMeta } from '@dashboard-builder/emis-server/infra/http';

// SvelteKit transport helpers (app-owned, not package-owned)

export function jsonEmisList<T>(
	rows: T[],
	options: { limit: number; offset?: number; sort: EmisSortRule[] }
) {
	return json({
		rows,
		meta: buildEmisListMeta({
			count: rows.length,
			limit: options.limit,
			offset: options.offset,
			sort: options.sort
		})
	});
}

export function jsonEmisError(status: number, code: string, error: string) {
	return json({ error, code }, { status });
}

export function handleEmisRoute(
	handler: RequestHandler,
	fallbackMessage = 'Unexpected EMIS server error'
): RequestHandler {
	return async (event) => {
		try {
			return await handler(event);
		} catch (error) {
			if (isEmisError(error)) {
				return jsonEmisError(error.status, error.code, error.message);
			}

			const message = error instanceof Error ? error.message : '';
			if (message.includes('DATABASE_URL')) {
				return jsonEmisError(500, 'EMIS_DATABASE_URL_MISSING', 'DATABASE_URL is not set');
			}
			if (message.includes('relation "emis.') || message.includes('schema "emis"')) {
				return jsonEmisError(
					503,
					'EMIS_SCHEMA_UNAVAILABLE',
					'EMIS schema is not initialized yet. Run db:reset and db:seed first.'
				);
			}
			if (
				message.includes('relation "mart_emis.') ||
				message.includes('schema "mart_emis"') ||
				message.includes('relation "mart.emis_ship_route_vessels"')
			) {
				return jsonEmisError(
					503,
					'EMIS_SHIP_ROUTE_MART_UNAVAILABLE',
					'EMIS ship-route marts are not initialized yet. Load the mart_emis slice before using ship routes.'
				);
			}

			return jsonEmisError(500, 'EMIS_INTERNAL_ERROR', fallbackMessage);
		}
	};
}
