/**
 * SvelteKit Server Hooks
 *
 * This file runs when the server starts.
 * Used to initialize background services like the alert scheduler
 * and EMIS session-based auth middleware.
 */

import { json, redirect, type Handle } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { startAlertScheduler, stopAlertScheduler } from '$lib/server/alerts';
import {
	getSession,
	hasMinRole,
	isAdminRoute,
	isAuthRoute,
	isDictionaryApiRoute,
	isEmisApiRoute,
	isEmisPageRoute,
	isSessionAuthReady,
	SESSION_COOKIE_NAME
} from '$lib/server/emis/infra/auth';

// ============================================================================
// Alert Scheduler Initialization
// ============================================================================

// Start scheduler when server boots
// Note: This runs once per server instance
if (process.env.ENABLE_ALERT_SCHEDULER !== 'false') {
	startAlertScheduler();
}

// Graceful shutdown handlers
process.on('SIGTERM', () => {
	console.log('[hooks.server] SIGTERM received, stopping scheduler...');
	stopAlertScheduler();
});

process.on('SIGINT', () => {
	console.log('[hooks.server] SIGINT received, stopping scheduler...');
	stopAlertScheduler();
});

// ============================================================================
// Auth-error helpers
// ============================================================================

/**
 * Resolve x-request-id from incoming headers or generate a new UUID.
 * Mirrors resolveRequestId() from $lib/server/emis/infra/http.ts.
 */
function resolveRequestId(request: Request): string {
	const incoming = request.headers.get('x-request-id')?.trim().slice(0, 128);
	return incoming || randomUUID();
}

/** Emit structured error log for auth failures (mirrors logEmisError pattern). */
function logAuthError(entry: {
	requestId: string;
	method: string;
	path: string;
	status: number;
	code: string;
	message: string;
}): void {
	const log = {
		service: 'emis',
		level: 'warn' as const,
		requestId: entry.requestId,
		method: entry.method,
		path: entry.path,
		status: entry.status,
		code: entry.code,
		message: entry.message
	};
	console.warn(JSON.stringify(log));
}

/**
 * Build a JSON auth-error response with x-request-id header and structured logging.
 * Fulfils RUNTIME_CONTRACT: request correlation on all EMIS responses.
 */
function emisAuthError(
	request: Request,
	pathname: string,
	status: number,
	code: string,
	message: string
) {
	const requestId = resolveRequestId(request);
	logAuthError({
		requestId,
		method: request.method,
		path: pathname,
		status,
		code,
		message
	});
	return json(
		{ error: message, code },
		{ status, headers: { 'x-request-id': requestId } }
	);
}

// ============================================================================
// Request Handler
// ============================================================================

export const handle: Handle = async ({ event, resolve }) => {
	const { cookies, url } = event;
	const pathname = url.pathname;

	// ---- Session resolution (always, regardless of auth mode) ----
	const sessionId = cookies.get(SESSION_COOKIE_NAME);
	if (sessionId) {
		const session = getSession(sessionId);
		event.locals.emisSession = session;
	}

	// ---- Auth enforcement (only when EMIS_AUTH_MODE=session and users configured) ----
	if (isSessionAuthReady()) {
		const session = event.locals.emisSession;

		// Skip auth checks for login/logout routes (prevent redirect loop)
		if (!isAuthRoute(pathname)) {
			// EMIS API routes: return 401/403 JSON for unauthenticated/unauthorized
			if (isEmisApiRoute(pathname)) {
				if (!session) {
					return emisAuthError(
						event.request,
						pathname,
						401,
						'UNAUTHORIZED',
						'Authentication required'
					);
				}

				// Dictionary API write routes require admin role
				// (docs/emis_access_model.md:31 — dictionary management is admin-only)
				if (
					isDictionaryApiRoute(pathname) &&
					event.request.method !== 'GET' &&
					!hasMinRole(session.role, 'admin')
				) {
					return emisAuthError(
						event.request,
						pathname,
						403,
						'FORBIDDEN',
						'Admin access required for dictionary management'
					);
				}
			}

			// EMIS page routes: redirect to login for unauthenticated
			if (isEmisPageRoute(pathname)) {
				if (!session) {
					const redirectTo = encodeURIComponent(pathname + url.search);
					return redirect(303, `/emis/login?redirect=${redirectTo}`);
				}

				// Admin pages: require admin role
				if (isAdminRoute(pathname) && !hasMinRole(session.role, 'admin')) {
					return emisAuthError(
						event.request,
						pathname,
						403,
						'FORBIDDEN',
						'Admin access required'
					);
				}
			}
		}
	}

	const response = await resolve(event);
	return response;
};
