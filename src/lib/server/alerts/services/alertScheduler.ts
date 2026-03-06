/**
 * Alert Scheduler
 *
 * Manages periodic execution of alert processing using node-cron.
 * Implements distributed locking to prevent duplicate execution
 * when running multiple server instances.
 */

import cron, { type ScheduledTask } from 'node-cron';
import { getPgPool } from '$lib/server/db/pg';
import { processAlerts } from './alertProcessor';

// ============================================================================
// Configuration
// ============================================================================

const INSTANCE_ID = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const LOCK_NAME = 'alert_scheduler';
const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

let schedulerTask: ScheduledTask | null = null;
let isRunning = false;

// ============================================================================
// Distributed Locking
// ============================================================================

/**
 * Try to acquire distributed lock.
 * Returns true if lock acquired, false if another instance holds it.
 */
async function tryAcquireLock(): Promise<boolean> {
	try {
		const pool = getPgPool();
		const now = new Date();
		const expiresAt = new Date(now.getTime() + LOCK_DURATION_MS);

		// Try to insert or update expired lock
		const result = await pool.query(
			`INSERT INTO alerts.scheduler_locks (lock_name, locked_by, locked_at, expires_at)
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT (lock_name) DO UPDATE
			 SET locked_by = $2, locked_at = $3, expires_at = $4
			 WHERE alerts.scheduler_locks.expires_at < $3
			    OR alerts.scheduler_locks.locked_by = $2
			 RETURNING lock_name`,
			[LOCK_NAME, INSTANCE_ID, now, expiresAt]
		);

		return (result.rowCount ?? 0) === 1;
	} catch (err) {
		console.error('[AlertScheduler] Failed to acquire lock:', err);
		return false;
	}
}

/**
 * Release the distributed lock
 */
async function releaseLock(): Promise<void> {
	try {
		const pool = getPgPool();
		await pool.query(
			`DELETE FROM alerts.scheduler_locks
			 WHERE lock_name = $1 AND locked_by = $2`,
			[LOCK_NAME, INSTANCE_ID]
		);
	} catch (err) {
		console.error('[AlertScheduler] Failed to release lock:', err);
	}
}

/**
 * Extend lock expiration (for long-running processes)
 */
async function extendLock(): Promise<boolean> {
	try {
		const pool = getPgPool();
		const expiresAt = new Date(Date.now() + LOCK_DURATION_MS);

		const result = await pool.query(
			`UPDATE alerts.scheduler_locks
			 SET expires_at = $1
			 WHERE lock_name = $2 AND locked_by = $3`,
			[expiresAt, LOCK_NAME, INSTANCE_ID]
		);

		return (result.rowCount ?? 0) === 1;
	} catch {
		return false;
	}
}

// ============================================================================
// Scheduled Check
// ============================================================================

async function runScheduledCheck(): Promise<void> {
	if (isRunning) {
		console.log('[AlertScheduler] Previous run still in progress, skipping');
		return;
	}

	const hasLock = await tryAcquireLock();
	if (!hasLock) {
		console.log('[AlertScheduler] Another instance is running, skipping');
		return;
	}

	isRunning = true;

	try {
		console.log('[AlertScheduler] Starting scheduled check...');

		// Extend lock periodically for long runs
		const lockExtender = setInterval(() => {
			extendLock().catch(() => {});
		}, LOCK_DURATION_MS / 2);

		try {
			const result = await processAlerts();
			console.log(`[AlertScheduler] Check completed: ${JSON.stringify(result)}`);
		} finally {
			clearInterval(lockExtender);
		}

	} catch (err) {
		console.error('[AlertScheduler] Error during processing:', err);
	} finally {
		isRunning = false;
		await releaseLock();
	}
}

// ============================================================================
// Scheduler Control
// ============================================================================

/**
 * Start the alert scheduler.
 * Uses ALERT_SCHEDULE env var for cron expression.
 * Default: '0 9 * * *' (daily at 9:00 AM)
 */
export function startAlertScheduler(): void {
	if (schedulerTask) {
		console.warn('[AlertScheduler] Already running');
		return;
	}

	// Check if DATABASE_URL is set (required for alerts)
	if (!process.env.DATABASE_URL) {
		console.warn('[AlertScheduler] DATABASE_URL not set, scheduler disabled');
		return;
	}

	const cronExpression = process.env.ALERT_SCHEDULE || '0 9 * * *';

	// Validate cron expression
	if (!cron.validate(cronExpression)) {
		console.error(`[AlertScheduler] Invalid cron expression: ${cronExpression}`);
		return;
	}

	schedulerTask = cron.schedule(cronExpression, runScheduledCheck, {
		timezone: process.env.ALERT_TIMEZONE || 'Europe/Moscow'
	});

	console.log(`[AlertScheduler] Started with schedule: ${cronExpression} (TZ: ${process.env.ALERT_TIMEZONE || 'Europe/Moscow'})`);
	console.log(`[AlertScheduler] Instance ID: ${INSTANCE_ID}`);
}

/**
 * Stop the alert scheduler
 */
export function stopAlertScheduler(): void {
	if (schedulerTask) {
		schedulerTask.stop();
		schedulerTask = null;
		releaseLock().catch(() => {});
		console.log('[AlertScheduler] Stopped');
	}
}

/**
 * Check if scheduler is running
 */
export function isSchedulerRunning(): boolean {
	return schedulerTask !== null;
}

/**
 * Manually trigger alert check (for testing)
 */
export async function triggerAlertCheck(): Promise<{ processed: number; triggered: number; errors: number }> {
	console.log('[AlertScheduler] Manual trigger requested');
	return processAlerts();
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus(): {
	running: boolean;
	instanceId: string;
	schedule: string;
} {
	return {
		running: schedulerTask !== null,
		instanceId: INSTANCE_ID,
		schedule: process.env.ALERT_SCHEDULE || '0 9 * * *'
	};
}
