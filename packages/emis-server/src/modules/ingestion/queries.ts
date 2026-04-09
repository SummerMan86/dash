import type { PoolClient } from 'pg';

import type {
	ImportRunSummary,
	ImportRunDetail,
	ImportCandidateSummary,
	ImportCandidateDetail,
	CandidateMatch,
	ListBatchesInput,
	ListBatchObjectsInput,
	ListConflictsInput
} from '@dashboard-builder/emis-contracts/emis-ingestion';

import { getDb } from '../../infra/db';
import { clampPageSize } from '../../infra/http';

export async function listImportRuns(
	filters: ListBatchesInput,
	client?: PoolClient
): Promise<ImportRunSummary[]> {
	const conditions: string[] = [];
	const values: unknown[] = [];

	if (filters.sourceCode) {
		values.push(filters.sourceCode);
		conditions.push(`source_code = $${values.length}`);
	}
	if (filters.status) {
		values.push(filters.status);
		conditions.push(`status = $${values.length}`);
	}

	const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
	const limit = clampPageSize(filters.limit);
	const offset = Math.max(0, Math.trunc(filters.offset ?? 0));
	values.push(limit, offset);

	const db = getDb(client);
	const result = await db.query(
		`SELECT id, source_code, status, started_at, finished_at,
			cnt_fetched, cnt_candidates, cnt_published, cnt_held, cnt_errors, actor_id
		 FROM stg_emis.obj_import_run
		 ${where}
		 ORDER BY started_at DESC, id DESC
		 LIMIT $${values.length - 1} OFFSET $${values.length}`,
		values
	);

	return result.rows.map(mapRunSummary);
}

export async function getImportRunDetail(
	id: string,
	client?: PoolClient
): Promise<ImportRunDetail | null> {
	const db = getDb(client);
	const result = await db.query(
		`SELECT id, source_code, status, started_at, finished_at,
			cnt_fetched, cnt_candidates, cnt_published, cnt_held, cnt_errors,
			actor_id, params, error_summary
		 FROM stg_emis.obj_import_run
		 WHERE id = $1`,
		[id]
	);

	if ((result.rowCount ?? 0) === 0) return null;
	const row = result.rows[0];

	return {
		...mapRunSummary(row),
		params: row.params ?? {},
		errorSummary: row.error_summary ?? {}
	};
}

export async function listRunCandidates(
	runId: string,
	filters: ListBatchObjectsInput,
	client?: PoolClient
): Promise<ImportCandidateSummary[]> {
	const conditions = ['c.run_id = $1'];
	const values: unknown[] = [runId];

	if (filters.status) {
		values.push(filters.status);
		conditions.push(`c.status = $${values.length}`);
	}
	if (filters.resolution) {
		values.push(filters.resolution);
		conditions.push(`c.resolution = $${values.length}`);
	}

	const limit = clampPageSize(filters.limit);
	const offset = Math.max(0, Math.trunc(filters.offset ?? 0));
	values.push(limit, offset);

	const db = getDb(client);
	const result = await db.query(
		`SELECT c.id, c.run_id, c.source_code, c.source_ref,
			c.name, c.object_type_code, c.country_code,
			REPLACE(ST_GeometryType(c.geom), 'ST_', '') AS geometry_type,
			c.status, c.resolution, c.promoted_object_id, c.created_at
		 FROM stg_emis.obj_import_candidate c
		 WHERE ${conditions.join(' AND ')}
		 ORDER BY c.created_at DESC, c.id DESC
		 LIMIT $${values.length - 1} OFFSET $${values.length}`,
		values
	);

	return result.rows.map(mapCandidateSummary);
}

export async function getCandidateDetail(
	id: string,
	client?: PoolClient
): Promise<ImportCandidateDetail | null> {
	const db = getDb(client);
	const candidateResult = await db.query(
		`SELECT c.id, c.run_id, c.source_code, c.source_ref,
			c.name, c.name_en, c.object_type_code, c.country_code,
			c.mapped_object_type_id, c.raw_payload,
			REPLACE(ST_GeometryType(c.geom), 'ST_', '') AS geometry_type,
			c.status, c.resolution, c.promoted_object_id,
			c.reviewed_at, c.reviewed_by, c.created_at
		 FROM stg_emis.obj_import_candidate c
		 WHERE c.id = $1`,
		[id]
	);

	if ((candidateResult.rowCount ?? 0) === 0) return null;
	const row = candidateResult.rows[0];

	const matchResult = await db.query(
		`SELECT m.id, m.matched_object_id, o.name AS matched_object_name,
			m.score, m.match_kind, m.match_details
		 FROM stg_emis.obj_candidate_match m
		 JOIN emis.objects o ON o.id = m.matched_object_id
		 WHERE m.candidate_id = $1
		 ORDER BY m.score DESC NULLS LAST, m.created_at ASC`,
		[id]
	);

	const matches: CandidateMatch[] = matchResult.rows.map((m) => ({
		id: m.id,
		matchedObjectId: m.matched_object_id,
		matchedObjectName: m.matched_object_name,
		score: m.score === null ? null : Number(m.score),
		matchKind: m.match_kind,
		matchDetails: m.match_details ?? {}
	}));

	return {
		...mapCandidateSummary(row),
		nameEn: row.name_en,
		rawPayload: row.raw_payload ?? {},
		mappedObjectTypeId: row.mapped_object_type_id,
		reviewedAt: row.reviewed_at?.toISOString() ?? null,
		reviewedBy: row.reviewed_by,
		matches
	};
}

export async function listConflicts(
	filters: ListConflictsInput,
	client?: PoolClient
): Promise<ImportCandidateSummary[]> {
	// Conflicts are unresolved candidates — exclude already-resolved terminal states
	const conditions = [
		`c.resolution IS NOT NULL`,
		`c.status NOT IN ('published', 'rejected')`
	];
	const values: unknown[] = [];

	if (filters.sourceCode) {
		values.push(filters.sourceCode);
		conditions.push(`c.source_code = $${values.length}`);
	}
	if (filters.status) {
		values.push(filters.status);
		conditions.push(`c.status = $${values.length}`);
	}
	if (filters.geometryType) {
		values.push(`ST_${filters.geometryType}`);
		conditions.push(`ST_GeometryType(c.geom) = $${values.length}`);
	}
	if (filters.mapped !== undefined) {
		if (filters.mapped) {
			conditions.push('c.mapped_object_type_id IS NOT NULL');
		} else {
			conditions.push('c.mapped_object_type_id IS NULL');
		}
	}

	const limit = clampPageSize(filters.limit);
	const offset = Math.max(0, Math.trunc(filters.offset ?? 0));
	values.push(limit, offset);

	const db = getDb(client);
	const result = await db.query(
		`SELECT c.id, c.run_id, c.source_code, c.source_ref,
			c.name, c.object_type_code, c.country_code,
			REPLACE(ST_GeometryType(c.geom), 'ST_', '') AS geometry_type,
			c.status, c.resolution, c.promoted_object_id, c.created_at
		 FROM stg_emis.obj_import_candidate c
		 WHERE ${conditions.join(' AND ')}
		 ORDER BY c.created_at DESC, c.id DESC
		 LIMIT $${values.length - 1} OFFSET $${values.length}`,
		values
	);

	return result.rows.map(mapCandidateSummary);
}

// --- Mappers ---

function mapRunSummary(row: Record<string, unknown>): ImportRunSummary {
	return {
		id: row.id as string,
		sourceCode: row.source_code as string,
		status: row.status as ImportRunSummary['status'],
		startedAt: (row.started_at as Date).toISOString(),
		finishedAt: row.finished_at ? (row.finished_at as Date).toISOString() : null,
		cntFetched: row.cnt_fetched as number,
		cntCandidates: row.cnt_candidates as number,
		cntPublished: row.cnt_published as number,
		cntHeld: row.cnt_held as number,
		cntErrors: row.cnt_errors as number,
		actorId: row.actor_id as string | null
	};
}

function mapCandidateSummary(row: Record<string, unknown>): ImportCandidateSummary {
	return {
		id: row.id as string,
		runId: row.run_id as string,
		sourceCode: row.source_code as string,
		sourceRef: row.source_ref as string,
		name: row.name as string | null,
		objectTypeCode: row.object_type_code as string | null,
		countryCode: row.country_code as string | null,
		geometryType: (row.geometry_type as ImportCandidateSummary['geometryType']) ?? null,
		status: row.status as ImportCandidateSummary['status'],
		resolution: (row.resolution as ImportCandidateSummary['resolution']) ?? null,
		promotedObjectId: row.promoted_object_id as string | null,
		createdAt: (row.created_at as Date).toISOString()
	};
}
