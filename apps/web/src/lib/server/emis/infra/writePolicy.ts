/**
 * Write-policy helper for EMIS write entry points.
 *
 * Wraps `resolveEmisWriteContext()` (audit utility from emis-server) with
 * configurable policy enforcement. This is the single checkpoint for write
 * authorization.
 *
 * Canonical contract: docs/emis/access_model.md.
 *
 * Supports two auth modes (EMIS_AUTH_MODE):
 *   - none (default): actor from headers, write-policy from EMIS_WRITE_POLICY
 *   - session: actor from session, role-based write enforcement
 *
 * Write-policy modes (EMIS_WRITE_POLICY, only relevant when EMIS_AUTH_MODE=none):
 *   - strict  (EMIS_WRITE_POLICY=strict or NODE_ENV=production): requires
 *             explicit actor header; missing actor -> throw EmisError(403,
 *             WRITE_NOT_ALLOWED).
 *   - permissive (EMIS_WRITE_POLICY=permissive or dev/local default): falls
 *             back to source-based default actor (backward-compatible with
 *             current dev workflow).
 *
 * No SQL. No business logic beyond policy enforcement.
 */

import {
	resolveEmisWriteContext,
	type EmisWriteSource,
	type EmisWriteContext
} from '@dashboard-builder/emis-server/infra/audit';
import { EmisError } from '@dashboard-builder/emis-server/infra/errors';
import { isSessionAuthReady, hasMinRole, type EmisSession } from './auth';

export type { EmisWriteSource, EmisWriteContext };

/**
 * Returns true when write-policy is in strict mode.
 *
 * Strict mode is active when:
 *   - `EMIS_WRITE_POLICY` env var is exactly `"strict"`, OR
 *   - `NODE_ENV` is `"production"` (unless explicitly overridden with `EMIS_WRITE_POLICY=permissive`).
 *
 * This matches the frozen contract in docs/emis/access_model.md and RUNTIME_CONTRACT.md.
 */
function isStrictMode(): boolean {
	const policy = process.env.EMIS_WRITE_POLICY;
	if (policy === 'strict') return true;
	if (policy === 'permissive') return false;
	return process.env.NODE_ENV === 'production';
}

/**
 * Returns the actor ID from explicit headers, or null if none provided.
 * Does NOT fall back to source-based defaults.
 */
function getExplicitActorId(request: Request): string | null {
	const emisActor = request.headers.get('x-emis-actor-id')?.trim();
	if (emisActor) return emisActor;

	const genericActor = request.headers.get('x-actor-id')?.trim();
	if (genericActor) return genericActor;

	return null;
}

/**
 * Validate write context for an EMIS write operation.
 *
 * When EMIS_AUTH_MODE=session and session auth is ready:
 *   - Requires a valid session with editor+ role.
 *   - Actor ID is derived from session userId.
 *   - Rejects with 401 if no session, 403 if insufficient role.
 *
 * When EMIS_AUTH_MODE=none (default):
 *   - In strict mode (EMIS_WRITE_POLICY=strict or production): requires explicit
 *     actor identity via x-emis-actor-id or x-actor-id header. Rejects with 403.
 *   - In permissive mode (EMIS_WRITE_POLICY=permissive or dev/local default):
 *     falls back to source-based default actor.
 *
 * @param request - The incoming HTTP request
 * @param source - The write source ('api' | 'manual-ui' | 'server')
 * @param locals - Optional App.Locals containing emisSession (for session-based auth)
 * @throws EmisError(401, 'UNAUTHORIZED') when session auth is active but no session
 * @throws EmisError(403, 'WRITE_NOT_ALLOWED') when role is insufficient or actor is missing
 */
export function assertWriteContext(
	request: Request,
	source: EmisWriteSource,
	locals?: App.Locals
): EmisWriteContext {
	// Session-based auth mode
	if (isSessionAuthReady()) {
		const session: EmisSession | null | undefined = locals?.emisSession;

		if (!session) {
			throw new EmisError(401, 'UNAUTHORIZED', 'Authentication required for write operations.');
		}

		if (!hasMinRole(session.role, 'editor')) {
			throw new EmisError(
				403,
				'WRITE_NOT_ALLOWED',
				'Insufficient role for write operations. Editor or admin role required.'
			);
		}

		// Use session userId as actor for audit trail
		return {
			actorId: session.userId,
			source
		};
	}

	// Header-based auth mode (EMIS_AUTH_MODE=none, current MVE behavior)
	if (isStrictMode()) {
		const explicitActor = getExplicitActorId(request);
		if (!explicitActor) {
			throw new EmisError(
				403,
				'WRITE_NOT_ALLOWED',
				'Write operations require actor identification. Set x-emis-actor-id or x-actor-id header.'
			);
		}
	}

	// In both modes, delegate to the canonical audit utility for context resolution.
	// In strict mode we already validated that an explicit actor header exists,
	// so resolveEmisWriteContext will pick it up (not fall back to defaults).
	return resolveEmisWriteContext(request, source);
}
