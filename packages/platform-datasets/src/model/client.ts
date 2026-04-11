/**
 * Client-side query state types for page-local dataset orchestration.
 *
 * Pages own loading/error/data state via AsyncState<T>.
 * Section components receive ready data or explicit loading/error props.
 * Dataset results do not live in global stores.
 *
 * Canonical reference: docs/architecture_dashboard_bi.md §4
 */

// ---------------------------------------------------------------------------
// AsyncState — page-local async query state
// ---------------------------------------------------------------------------

export type AsyncState<T> =
	| { status: 'idle' }
	| { status: 'loading' }
	| { status: 'ok'; data: T; refreshing?: boolean }
	| { status: 'error'; error: DatasetClientError; data?: T };

// ---------------------------------------------------------------------------
// DatasetClientError — normalized client-side error shape
// ---------------------------------------------------------------------------

export type DatasetClientError = {
	code: string;
	message: string;
	retryable: boolean;
	requestId?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create an idle state. */
export function idle<T>(): AsyncState<T> {
	return { status: 'idle' };
}

/** Create a loading state. */
export function loading<T>(): AsyncState<T> {
	return { status: 'loading' };
}

/** Create a success state, optionally marking as refreshing. */
export function ok<T>(data: T, refreshing?: boolean): AsyncState<T> {
	return refreshing ? { status: 'ok', data, refreshing } : { status: 'ok', data };
}

/** Create an error state, optionally preserving previous data. */
export function error<T>(err: DatasetClientError, previousData?: T): AsyncState<T> {
	return previousData !== undefined
		? { status: 'error', error: err, data: previousData }
		: { status: 'error', error: err };
}

/**
 * Normalize a fetch/server error into DatasetClientError.
 *
 * Handles:
 * - Server JSON errors (DatasetError shape from executeDatasetQuery)
 * - Network errors (TypeError from fetch)
 * - Generic Error instances
 */
export function normalizeDatasetError(
	e: unknown,
	responseBody?: string,
): DatasetClientError {
	// Try to parse server JSON error (DatasetError shape)
	if (responseBody) {
		try {
			const parsed = JSON.parse(responseBody);
			if (parsed && typeof parsed.code === 'string') {
				return {
					code: parsed.code,
					message: parsed.error ?? parsed.message ?? 'Unknown error',
					retryable: parsed.retryable ?? false,
					...(parsed.requestId ? { requestId: parsed.requestId } : {}),
				};
			}
		} catch {
			// Not JSON — fall through
		}
	}

	// Network or fetch errors
	if (e instanceof TypeError) {
		return {
			code: 'NETWORK_ERROR',
			message: 'Network request failed',
			retryable: true,
		};
	}

	// Generic errors
	if (e instanceof Error) {
		return {
			code: 'CLIENT_ERROR',
			message: e.message,
			retryable: false,
		};
	}

	return {
		code: 'UNKNOWN_ERROR',
		message: 'An unexpected error occurred',
		retryable: false,
	};
}
