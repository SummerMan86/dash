/**
 * SvelteKit Server Hooks
 *
 * This file runs when the server starts.
 * Used to initialize background services like the alert scheduler
 * and EMIS session-based auth middleware.
 */

import { json, redirect, type Handle } from '@sveltejs/kit';
import { startAlertScheduler, stopAlertScheduler } from '$lib/server/alerts';
import {
	getSession,
	hasMinRole,
	isAdminRoute,
	isAuthRoute,
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
			// EMIS API routes: return 401 JSON for unauthenticated
			if (isEmisApiRoute(pathname)) {
				if (!session) {
					return json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, { status: 401 });
				}

				// Admin API routes (dictionaries) - require admin for write methods
				// Read access is granted to any authenticated user
				// Write enforcement is handled by assertWriteContext() for mutations
			}

			// EMIS page routes: redirect to login for unauthenticated
			if (isEmisPageRoute(pathname)) {
				if (!session) {
					const redirectTo = encodeURIComponent(pathname + url.search);
					return redirect(303, `/emis/login?redirect=${redirectTo}`);
				}

				// Admin pages: require admin role
				if (isAdminRoute(pathname) && !hasMinRole(session.role, 'admin')) {
					return json({ error: 'Admin access required', code: 'FORBIDDEN' }, { status: 403 });
				}
			}
		}
	}

	const response = await resolve(event);
	return response;
};
