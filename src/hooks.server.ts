/**
 * SvelteKit Server Hooks
 *
 * This file runs when the server starts.
 * Used to initialize background services like the alert scheduler.
 */

import type { Handle } from '@sveltejs/kit';
import { startAlertScheduler, stopAlertScheduler } from '$lib/server/alerts';

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
	// Add any request-level middleware here if needed
	// For example: logging, auth checks, tenant resolution

	const response = await resolve(event);
	return response;
};
