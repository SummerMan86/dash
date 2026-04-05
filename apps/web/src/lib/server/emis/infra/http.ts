import { json, type RequestHandler } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
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

export function jsonEmisError(
	status: number,
	code: string,
	error: string,
	headers?: Record<string, string>
) {
	return json({ error, code }, { status, headers });
}

/**
 * Resolve `x-request-id` from the incoming request, or generate a new UUID.
 */
function resolveRequestId(request: Request): string {
	const incoming = request.headers.get('x-request-id')?.trim().slice(0, 128);
	return incoming || randomUUID();
}

/**
 * Resolve actor ID from request headers (for tracing only, not auth).
 */
function resolveActorId(request: Request): string | null {
	return (
		request.headers.get('x-emis-actor-id')?.trim() ||
		request.headers.get('x-actor-id')?.trim() ||
		null
	);
}

/**
 * Emit a structured error log for EMIS route failures.
 *
 * Logged on every 4xx/5xx response produced by handleEmisRoute.
 * Intentionally does NOT log request bodies, PII, or large GeoJSON payloads.
 */
function logEmisError(entry: {
	requestId: string;
	method: string;
	path: string;
	status: number;
	code: string;
	durationMs: number;
	actorId: string | null;
	message?: string;
}): void {
	const log: Record<string, unknown> = {
		service: 'emis',
		level: entry.status >= 500 ? 'error' : 'warn',
		requestId: entry.requestId,
		method: entry.method,
		path: entry.path,
		status: entry.status,
		code: entry.code,
		durationMs: entry.durationMs
	};
	if (entry.actorId) {
		log.actorId = entry.actorId;
	}
	if (entry.message) {
		log.message = entry.message;
	}

	// Use JSON structured log. console.error for 5xx, console.warn for 4xx.
	const output = JSON.stringify(log);
	if (entry.status >= 500) {
		console.error(output);
	} else {
		console.warn(output);
	}
}

export function handleEmisRoute(
	handler: RequestHandler,
	fallbackMessage = 'Unexpected EMIS server error'
): RequestHandler {
	return async (event) => {
		const { request } = event;
		const requestId = resolveRequestId(request);
		const startMs = Date.now();

		try {
			const response = await handler(event);

			// Propagate x-request-id on all responses (success and error alike)
			response.headers.set('x-request-id', requestId);

			return response;
		} catch (error) {
			const correlationHeaders: Record<string, string> = {
				'x-request-id': requestId
			};
			const durationMs = Date.now() - startMs;
			const method = request.method;
			const path = new URL(request.url).pathname;
			const actorId = resolveActorId(request);

			if (isEmisError(error)) {
				logEmisError({
					requestId,
					method,
					path,
					status: error.status,
					code: error.code,
					durationMs,
					actorId,
					message: error.message
				});
				return jsonEmisError(error.status, error.code, error.message, correlationHeaders);
			}

			const message = error instanceof Error ? error.message : '';

			if (message.includes('DATABASE_URL')) {
				const code = 'EMIS_DATABASE_URL_MISSING';
				logEmisError({
					requestId,
					method,
					path,
					status: 500,
					code,
					durationMs,
					actorId
				});
				return jsonEmisError(500, code, 'DATABASE_URL is not set', correlationHeaders);
			}

			if (message.includes('relation "emis.') || message.includes('schema "emis"')) {
				const code = 'EMIS_SCHEMA_UNAVAILABLE';
				logEmisError({
					requestId,
					method,
					path,
					status: 503,
					code,
					durationMs,
					actorId
				});
				return jsonEmisError(
					503,
					code,
					'EMIS schema is not initialized yet. Run db:reset and db:seed first.',
					correlationHeaders
				);
			}

			if (
				message.includes('relation "mart_emis.') ||
				message.includes('schema "mart_emis"') ||
				message.includes('relation "mart.emis_ship_route_vessels"')
			) {
				const code = 'EMIS_SHIP_ROUTE_MART_UNAVAILABLE';
				logEmisError({
					requestId,
					method,
					path,
					status: 503,
					code,
					durationMs,
					actorId
				});
				return jsonEmisError(
					503,
					code,
					'EMIS ship-route marts are not initialized yet. Load the mart_emis slice before using ship routes.',
					correlationHeaders
				);
			}

			logEmisError({
				requestId,
				method,
				path,
				status: 500,
				code: 'EMIS_INTERNAL_ERROR',
				durationMs,
				actorId,
				message: message || undefined
			});
			return jsonEmisError(500, 'EMIS_INTERNAL_ERROR', fallbackMessage, correlationHeaders);
		}
	};
}
