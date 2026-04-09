import type { PoolClient } from 'pg';

import type {
	CandidateResolution,
	CandidateStatus,
	ImportRunStatus
} from '@dashboard-builder/emis-contracts/emis-ingestion';
import type { EmisGeometry } from '@dashboard-builder/emis-contracts/emis-geo';

import { getDb } from '../../infra/db';

// --- Import Run ---

export type InsertImportRunParams = {
	sourceCode: string;
	params: Record<string, unknown>;
	actorId: string | null;
};

export async function insertImportRun(
	run: InsertImportRunParams,
	client?: PoolClient
): Promise<string> {
	const db = getDb(client);
	const result = await db.query(
		`INSERT INTO stg_emis.obj_import_run (source_code, params, actor_id)
		 VALUES ($1, $2, $3)
		 RETURNING id`,
		[run.sourceCode, JSON.stringify(run.params), run.actorId]
	);
	return result.rows[0].id;
}

export type UpdateRunStatusOptions = {
	counters?: Partial<{
		cntFetched: number;
		cntCandidates: number;
		cntPublished: number;
		cntHeld: number;
		cntErrors: number;
	}>;
	errorSummary?: Record<string, unknown>;
	client?: PoolClient;
};

export async function updateImportRunStatus(
	id: string,
	status: ImportRunStatus,
	options?: UpdateRunStatusOptions
): Promise<void> {
	const { counters, errorSummary, client } = options ?? {};
	const sets = ['status = $2'];
	const values: unknown[] = [id, status];

	if (status === 'completed' || status === 'failed') {
		sets.push('finished_at = now()');
	}
	if (counters?.cntFetched !== undefined) {
		values.push(counters.cntFetched);
		sets.push(`cnt_fetched = $${values.length}`);
	}
	if (counters?.cntCandidates !== undefined) {
		values.push(counters.cntCandidates);
		sets.push(`cnt_candidates = $${values.length}`);
	}
	if (counters?.cntPublished !== undefined) {
		values.push(counters.cntPublished);
		sets.push(`cnt_published = $${values.length}`);
	}
	if (counters?.cntHeld !== undefined) {
		values.push(counters.cntHeld);
		sets.push(`cnt_held = $${values.length}`);
	}
	if (counters?.cntErrors !== undefined) {
		values.push(counters.cntErrors);
		sets.push(`cnt_errors = $${values.length}`);
	}
	if (errorSummary) {
		values.push(JSON.stringify(errorSummary));
		sets.push(`error_summary = $${values.length}`);
	}

	const db = getDb(client);
	await db.query(
		`UPDATE stg_emis.obj_import_run SET ${sets.join(', ')} WHERE id = $1`,
		values
	);
}

// --- Import Candidate ---

export type InsertCandidateParams = {
	runId: string;
	sourceCode: string;
	sourceRef: string;
	rawPayload: Record<string, unknown>;
	name: string | null;
	nameEn: string | null;
	objectTypeCode: string | null;
	countryCode: string | null;
	mappedObjectTypeId: string | null;
	geometry: EmisGeometry | null;
};

export async function insertImportCandidate(
	candidate: InsertCandidateParams,
	client?: PoolClient
): Promise<string> {
	const db = getDb(client);
	const geomSql = candidate.geometry
		? `ST_SetSRID(ST_GeomFromGeoJSON($10), 4326)`
		: 'NULL';
	const centroidSql = candidate.geometry
		? `ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON($10), 4326))`
		: 'NULL';

	const values: unknown[] = [
		candidate.runId,
		candidate.sourceCode,
		candidate.sourceRef,
		JSON.stringify(candidate.rawPayload),
		candidate.name,
		candidate.nameEn,
		candidate.objectTypeCode,
		candidate.countryCode,
		candidate.mappedObjectTypeId,
		candidate.geometry ? JSON.stringify(candidate.geometry) : null
	];

	const result = await db.query(
		`INSERT INTO stg_emis.obj_import_candidate
			(run_id, source_code, source_ref, raw_payload,
			 name, name_en, object_type_code, country_code,
			 mapped_object_type_id, geom, centroid)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ${geomSql}, ${centroidSql})
		 RETURNING id`,
		values
	);
	return result.rows[0].id;
}

export async function updateCandidateStatus(
	id: string,
	status: CandidateStatus,
	resolution?: CandidateResolution | null,
	reviewedBy?: string | null,
	client?: PoolClient
): Promise<void> {
	const sets = ['status = $2'];
	const values: unknown[] = [id, status];

	if (resolution !== undefined) {
		values.push(resolution);
		sets.push(`resolution = $${values.length}`);
	}
	if (reviewedBy !== undefined) {
		values.push(reviewedBy);
		sets.push(`reviewed_by = $${values.length}`);
		sets.push('reviewed_at = now()');
	}

	const db = getDb(client);
	await db.query(
		`UPDATE stg_emis.obj_import_candidate SET ${sets.join(', ')} WHERE id = $1`,
		values
	);
}

export async function markCandidatePublished(
	id: string,
	promotedObjectId: string,
	client?: PoolClient
): Promise<void> {
	const db = getDb(client);
	await db.query(
		`UPDATE stg_emis.obj_import_candidate
		 SET status = 'published', promoted_object_id = $2, reviewed_at = now()
		 WHERE id = $1`,
		[id, promotedObjectId]
	);
}

// --- Candidate Match ---

export type InsertCandidateMatchParams = {
	candidateId: string;
	matchedObjectId: string;
	score: number | null;
	matchKind: string;
	matchDetails: Record<string, unknown>;
};

export async function insertCandidateMatch(
	match: InsertCandidateMatchParams,
	client?: PoolClient
): Promise<string> {
	const db = getDb(client);
	const result = await db.query(
		`INSERT INTO stg_emis.obj_candidate_match
			(candidate_id, matched_object_id, score, match_kind, match_details)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id`,
		[
			match.candidateId,
			match.matchedObjectId,
			match.score,
			match.matchKind,
			JSON.stringify(match.matchDetails)
		]
	);
	return result.rows[0].id;
}

// --- Source Refs ---

export async function upsertObjectSourceRef(
	objectId: string,
	sourceCode: string,
	sourceRef: string,
	isPrimary: boolean,
	client?: PoolClient
): Promise<void> {
	const db = getDb(client);
	await db.query(
		`INSERT INTO emis.object_source_refs (object_id, source_code, source_ref, is_primary)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (source_code, source_ref) DO UPDATE
		 SET object_id = $1, is_primary = $4, updated_at = now()`,
		[objectId, sourceCode, sourceRef, isPrimary]
	);
}
