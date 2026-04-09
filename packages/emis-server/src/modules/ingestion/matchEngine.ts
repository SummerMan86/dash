import type { PoolClient } from 'pg';

import type { CandidateResolution } from '@dashboard-builder/emis-contracts/emis-ingestion';

import { getDb } from '../../infra/db';

/**
 * Source-priority policy: which source wins by object type.
 * If the candidate's source matches the winner for the object type,
 * a match is a clear winner. Otherwise it stays unresolved.
 */
const SOURCE_PRIORITY: Record<string, string> = {
	power_plant: 'gem',
	coal_mine: 'gem',
	gas_pipeline: 'gem',
	oil_pipeline: 'gem',
	port: 'osm',
	terminal: 'osm',
	storage: 'osm',
	substation: 'osm'
};

export type MatchResult = {
	resolution: CandidateResolution;
	matches: MatchCandidate[];
};

export type MatchCandidate = {
	objectId: string;
	objectName: string;
	score: number;
	matchKind: 'source_ref' | 'name_proximity' | 'spatial';
};

/**
 * Find potential matches for a candidate against curated emis.objects.
 * Strategy:
 * 1. Exact source_ref match via object_source_refs
 * 2. Name similarity (case-insensitive exact match on name or name_en)
 * 3. Spatial proximity (within 500m centroid distance)
 */
export async function findMatches(
	candidate: {
		sourceCode: string;
		sourceRef: string;
		name: string | null;
		objectTypeCode: string | null;
		hasCentroid: boolean;
		candidateId: string;
	},
	client?: PoolClient
): Promise<MatchCandidate[]> {
	const db = getDb(client);
	const matches: MatchCandidate[] = [];

	// 1. Source ref match — highest confidence
	const refResult = await db.query(
		`SELECT sr.object_id, o.name
		 FROM emis.object_source_refs sr
		 JOIN emis.objects o ON o.id = sr.object_id AND o.deleted_at IS NULL
		 WHERE sr.source_code = $1 AND sr.source_ref = $2`,
		[candidate.sourceCode, candidate.sourceRef]
	);
	for (const row of refResult.rows) {
		matches.push({
			objectId: row.object_id,
			objectName: row.name,
			score: 1.0,
			matchKind: 'source_ref'
		});
	}

	if (matches.length > 0) return matches;

	// 2. Name match — case-insensitive exact on name or name_en within same object type
	if (candidate.name && candidate.objectTypeCode) {
		const nameResult = await db.query(
			`SELECT o.id, o.name
			 FROM emis.objects o
			 JOIN emis.object_types ot ON ot.id = o.object_type_id
			 WHERE o.deleted_at IS NULL
			   AND ot.code = $1
			   AND (LOWER(o.name) = LOWER($2) OR LOWER(o.name_en) = LOWER($2))
			 LIMIT 5`,
			[candidate.objectTypeCode, candidate.name]
		);
		for (const row of nameResult.rows) {
			matches.push({
				objectId: row.id,
				objectName: row.name,
				score: 0.8,
				matchKind: 'name_proximity'
			});
		}
	}

	if (matches.length > 0) return matches;

	// 3. Spatial proximity — centroid within 500m, same object type
	if (candidate.hasCentroid && candidate.objectTypeCode) {
		const spatialResult = await db.query(
			`SELECT o.id, o.name,
				ST_Distance(o.centroid::geography, c.centroid::geography) AS dist_m
			 FROM emis.objects o
			 JOIN emis.object_types ot ON ot.id = o.object_type_id
			 CROSS JOIN stg_emis.obj_import_candidate c
			 WHERE c.id = $1
			   AND o.deleted_at IS NULL
			   AND ot.code = $2
			   AND c.centroid IS NOT NULL
			   AND o.centroid IS NOT NULL
			   AND ST_DWithin(o.centroid::geography, c.centroid::geography, 500)
			 ORDER BY dist_m ASC
			 LIMIT 5`,
			[candidate.candidateId, candidate.objectTypeCode]
		);
		for (const row of spatialResult.rows) {
			const dist = Number(row.dist_m);
			const score = Math.max(0.3, 0.7 - dist / 1000);
			matches.push({
				objectId: row.id,
				objectName: row.name,
				score: Math.round(score * 10000) / 10000,
				matchKind: 'spatial'
			});
		}
	}

	return matches;
}

/**
 * Determine resolution outcome based on matches and source-priority policy.
 */
export function resolveCandidate(
	sourceCode: string,
	objectTypeCode: string | null,
	matches: MatchCandidate[]
): CandidateResolution {
	// No mapped object type — invalid regardless of matches
	if (!objectTypeCode) return 'invalid_or_unmapped';

	// No matches — unique new object
	if (matches.length === 0) return 'unique';

	const bestMatch = matches[0];

	// Source ref match is always definitive
	if (bestMatch.matchKind === 'source_ref') {
		return 'duplicate_with_clear_winner';
	}

	// Check source-priority policy — clear winner only if this source is preferred
	const preferredSource = SOURCE_PRIORITY[objectTypeCode];
	const isPreferredSource = preferredSource === sourceCode;

	// Name match is clear winner only when source-priority agrees
	if (bestMatch.matchKind === 'name_proximity' && bestMatch.score >= 0.8 && isPreferredSource) {
		return 'duplicate_with_clear_winner';
	}

	// Spatial/other match with source-priority backing
	if (isPreferredSource && bestMatch.score >= 0.7) {
		return 'duplicate_with_clear_winner';
	}

	// Matches exist but no clear winner — hold for review
	return 'possible_duplicate_low_confidence';
}
