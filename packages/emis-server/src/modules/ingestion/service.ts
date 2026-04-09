import type { PoolClient } from 'pg';

import type {
	CandidateResolution,
	TriggerIngestionInput
} from '@dashboard-builder/emis-contracts/emis-ingestion';

import { withTransaction } from '../../infra/db';
import { EmisError } from '../../infra/errors';
import { getSourceAdapter } from './adapters';
import { findMatches, resolveCandidate } from './matchEngine';
import {
	insertImportRun,
	updateImportRunStatus,
	insertImportCandidate,
	insertCandidateMatch,
	updateCandidateStatus,
	markCandidatePublished,
	upsertObjectSourceRef
} from './repository';
import { getCandidateDetail } from './queries';

/**
 * Trigger a full ingestion run:
 * 1. Create run row
 * 2. Fetch candidates from source adapter
 * 3. Insert candidates into staging
 * 4. Match each candidate against curated objects
 * 5. Auto-resolve clear outcomes; hold ambiguous ones
 * 6. Finalize run counters
 */
export async function triggerIngestion(
	input: TriggerIngestionInput,
	actorId: string | null
): Promise<string> {
	const adapter = getSourceAdapter(input.sourceCode);

	const runId = await insertImportRun({
		sourceCode: input.sourceCode,
		params: input.params ?? {},
		actorId
	});

	try {
		await updateImportRunStatus(runId, 'fetching');

		const rawCandidates = await adapter.fetch(input.params ?? {});
		await updateImportRunStatus(runId, 'matching', {
			counters: { cntFetched: rawCandidates.length }
		});

		let cntCandidates = 0;
		let cntPublished = 0;
		let cntHeld = 0;
		let cntErrors = 0;

		for (const raw of rawCandidates) {
			try {
				const mappedTypeId = raw.objectTypeCode
					? await lookupObjectTypeId(raw.objectTypeCode)
					: null;

				const candidateId = await insertImportCandidate({
					runId,
					sourceCode: input.sourceCode,
					sourceRef: raw.sourceRef,
					rawPayload: raw.rawPayload,
					name: raw.name,
					nameEn: raw.nameEn,
					objectTypeCode: raw.objectTypeCode,
					countryCode: raw.countryCode,
					mappedObjectTypeId: mappedTypeId,
					geometry: raw.geometry
				});
				cntCandidates++;

				const matches = await findMatches({
					sourceCode: input.sourceCode,
					sourceRef: raw.sourceRef,
					name: raw.name,
					objectTypeCode: raw.objectTypeCode,
					hasCentroid: raw.geometry != null,
					candidateId
				});

				for (const match of matches) {
					await insertCandidateMatch({
						candidateId,
						matchedObjectId: match.objectId,
						score: match.score,
						matchKind: match.matchKind,
						matchDetails: {}
					});
				}

				const resolution = resolveCandidate(
					input.sourceCode,
					raw.objectTypeCode,
					matches
				);

				if (resolution === 'unique') {
					await withTransaction(async (client) => {
						const objectId = await publishAsNewObject(candidateId, client);
						await markCandidatePublished(candidateId, objectId, client);
						await upsertObjectSourceRef(
							objectId,
							input.sourceCode,
							raw.sourceRef,
							true,
							client
						);
					});
					cntPublished++;
				} else if (resolution === 'duplicate_with_clear_winner') {
					const bestMatch = matches[0];
					await withTransaction(async (client) => {
						await refreshCuratedObject(candidateId, bestMatch.objectId, client);
						await markCandidatePublished(candidateId, bestMatch.objectId, client);
						await upsertObjectSourceRef(
							bestMatch.objectId,
							input.sourceCode,
							raw.sourceRef,
							false,
							client
						);
					});
					cntPublished++;
				} else {
					// possible_duplicate_low_confidence or invalid_or_unmapped → hold
					await updateCandidateStatus(candidateId, 'matched', resolution);
					cntHeld++;
				}
			} catch {
				cntErrors++;
			}
		}

		await updateImportRunStatus(runId, 'completed', {
			counters: { cntCandidates, cntPublished, cntHeld, cntErrors }
		});

		return runId;
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		await updateImportRunStatus(runId, 'failed', {
			errorSummary: { error: message }
		});
		throw err;
	}
}

/**
 * Manually resolve a conflict (candidate in staging).
 */
export async function resolveConflict(
	candidateId: string,
	resolution: CandidateResolution,
	targetObjectId: string | undefined,
	actorId: string | null
): Promise<void> {
	const candidate = await getCandidateDetail(candidateId);
	if (!candidate) {
		throw new EmisError(404, 'CANDIDATE_NOT_FOUND', 'Candidate not found');
	}
	if (candidate.status === 'published' || candidate.status === 'rejected') {
		throw new EmisError(409, 'CANDIDATE_ALREADY_RESOLVED', 'Candidate already resolved');
	}

	if (resolution === 'unique') {
		await withTransaction(async (client) => {
			const objectId = await publishAsNewObject(candidateId, client);
			await markCandidatePublished(candidateId, objectId, client);
			await upsertObjectSourceRef(
				objectId,
				candidate.sourceCode,
				candidate.sourceRef,
				true,
				client
			);
		});
	} else if (resolution === 'duplicate_with_clear_winner') {
		if (!targetObjectId) {
			throw new EmisError(
				400,
				'VALIDATION_ERROR',
				'targetObjectId required for duplicate_with_clear_winner'
			);
		}
		await withTransaction(async (client) => {
			await refreshCuratedObject(candidateId, targetObjectId, client);
			await markCandidatePublished(candidateId, targetObjectId, client);
			await upsertObjectSourceRef(
				targetObjectId,
				candidate.sourceCode,
				candidate.sourceRef,
				false,
				client
			);
		});
	} else if (resolution === 'invalid_or_unmapped') {
		// Explicit rejection — terminal state
		await updateCandidateStatus(candidateId, 'rejected', resolution, actorId);
	} else {
		// possible_duplicate_low_confidence → hold for further review, not terminal
		await updateCandidateStatus(candidateId, 'held', resolution, actorId);
	}
}

// --- Internal helpers ---

async function lookupObjectTypeId(code: string): Promise<string | null> {
	const { getDb } = await import('../../infra/db');
	const db = getDb();
	const result = await db.query(
		'SELECT id FROM emis.object_types WHERE code = $1 LIMIT 1',
		[code]
	);
	return (result.rowCount ?? 0) > 0 ? result.rows[0].id : null;
}

async function publishAsNewObject(
	candidateId: string,
	client: PoolClient
): Promise<string> {
	const { getDb } = await import('../../infra/db');
	const db = getDb(client);
	const result = await db.query(
		`INSERT INTO emis.objects (
			object_type_id, name, name_en, country_code,
			geom, centroid, source_origin, created_by, updated_by
		)
		SELECT
			c.mapped_object_type_id, c.name, c.name_en, c.country_code,
			c.geom, c.centroid, 'ingestion', 'ingestion', 'ingestion'
		FROM stg_emis.obj_import_candidate c
		WHERE c.id = $1 AND c.mapped_object_type_id IS NOT NULL
		RETURNING id`,
		[candidateId]
	);
	if ((result.rowCount ?? 0) === 0) {
		throw new EmisError(
			400,
			'CANDIDATE_NOT_PUBLISHABLE',
			'Cannot publish candidate: missing mapped object type'
		);
	}
	return result.rows[0].id;
}

async function refreshCuratedObject(
	candidateId: string,
	objectId: string,
	client: PoolClient
): Promise<void> {
	const { getDb } = await import('../../infra/db');
	const db = getDb(client);
	await db.query(
		`UPDATE emis.objects o SET
			name = COALESCE(c.name, o.name),
			name_en = COALESCE(c.name_en, o.name_en),
			country_code = COALESCE(c.country_code, o.country_code),
			geom = COALESCE(c.geom, o.geom),
			centroid = COALESCE(c.centroid, o.centroid),
			source_origin = 'ingestion',
			updated_by = 'ingestion',
			updated_at = now()
		FROM stg_emis.obj_import_candidate c
		WHERE c.id = $1 AND o.id = $2`,
		[candidateId, objectId]
	);
}
