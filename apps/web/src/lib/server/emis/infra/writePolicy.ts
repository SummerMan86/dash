/**
 * Write-policy helper for EMIS write entry points.
 *
 * Wraps `resolveEmisWriteContext()` (audit utility from emis-server) with
 * configurable policy enforcement. This is the single checkpoint for write
 * authorization in MVE.
 *
 * Canonical contract: docs/emis_access_model.md section 4.
 *
 * Modes:
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

export type { EmisWriteSource, EmisWriteContext };

/**
 * Returns true when write-policy is in strict mode.
 *
 * Strict mode is active when:
 *   - `EMIS_WRITE_POLICY` env var is exactly `"strict"`, OR
 *   - `NODE_ENV` is `"production"` (unless explicitly overridden with `EMIS_WRITE_POLICY=permissive`).
 *
 * This matches the frozen contract in docs/emis_access_model.md and RUNTIME_CONTRACT.md.
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
 * In strict mode (EMIS_WRITE_POLICY=strict or production): requires an explicit
 * actor identity via x-emis-actor-id or x-actor-id header. Rejects with 403 if
 * missing.
 *
 * In permissive mode (EMIS_WRITE_POLICY=permissive or dev/local default): falls
 * back to source-based default actor (same behavior as resolveEmisWriteContext).
 *
 * @throws EmisError(403, 'WRITE_NOT_ALLOWED') in strict mode when actor is missing
 */
export function assertWriteContext(
	request: Request,
	source: EmisWriteSource
): EmisWriteContext {
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
