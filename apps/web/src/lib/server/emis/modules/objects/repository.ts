import type { PoolClient } from 'pg';

import type { CreateEmisObjectInput, UpdateEmisObjectInput } from '$entities/emis-object';

import { getDb } from '../../infra/db';

function jsonOrNull(value: Record<string, unknown> | undefined): string {
	return JSON.stringify(value ?? {});
}

function geometrySql(paramIndex: number): string {
	return `ST_SetSRID(ST_GeomFromGeoJSON($${paramIndex}), 4326)`;
}

export async function objectExists(id: string, client?: PoolClient): Promise<boolean> {
	const db = getDb(client);
	const result = await db.query(
		'SELECT 1 FROM emis.objects WHERE id = $1 AND deleted_at IS NULL LIMIT 1',
		[id]
	);
	return (result.rowCount ?? 0) > 0;
}

export async function insertObject(
	input: CreateEmisObjectInput,
	actorId: string | null,
	client?: PoolClient
): Promise<string> {
	const db = getDb(client);
	const result = await db.query(
		`INSERT INTO emis.objects (
			external_id,
			object_type_id,
			name,
			name_en,
			country_code,
			region,
			status,
			operator_name,
			description,
			attributes,
			geom,
			centroid,
			source_note,
			source_origin,
			created_by,
			updated_by
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb,
			${geometrySql(11)},
			ST_Centroid(${geometrySql(11)}),
			$12,
			'manual',
			$13,
			$13
		)
		RETURNING id`,
		[
			input.externalId ?? null,
			input.objectTypeId,
			input.name,
			input.nameEn ?? null,
			input.countryCode ?? null,
			input.region ?? null,
			input.status ?? 'active',
			input.operatorName ?? null,
			input.description ?? null,
			jsonOrNull(input.attributes),
			JSON.stringify(input.geometry),
			input.sourceNote ?? null,
			actorId
		]
	);
	return result.rows[0].id;
}

export async function updateObject(
	id: string,
	patch: UpdateEmisObjectInput,
	actorId: string | null,
	client?: PoolClient
): Promise<boolean> {
	const sets: string[] = [];
	const values: unknown[] = [];

	const push = (sql: string, value: unknown) => {
		values.push(value);
		sets.push(`${sql} = $${values.length}`);
	};

	if ('externalId' in patch) push('external_id', patch.externalId ?? null);
	if ('objectTypeId' in patch && patch.objectTypeId) push('object_type_id', patch.objectTypeId);
	if ('name' in patch && patch.name) push('name', patch.name);
	if ('nameEn' in patch) push('name_en', patch.nameEn ?? null);
	if ('countryCode' in patch) push('country_code', patch.countryCode ?? null);
	if ('region' in patch) push('region', patch.region ?? null);
	if ('status' in patch && patch.status) push('status', patch.status);
	if ('operatorName' in patch) push('operator_name', patch.operatorName ?? null);
	if ('description' in patch) push('description', patch.description ?? null);
	if ('attributes' in patch && patch.attributes) {
		values.push(JSON.stringify(patch.attributes));
		sets.push(`attributes = $${values.length}::jsonb`);
	}
	if ('geometry' in patch && patch.geometry) {
		values.push(JSON.stringify(patch.geometry));
		const geomParam = `$${values.length}`;
		sets.push(`geom = ST_SetSRID(ST_GeomFromGeoJSON(${geomParam}), 4326)`);
		sets.push(`centroid = ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON(${geomParam}), 4326))`);
	}
	if ('sourceNote' in patch) push('source_note', patch.sourceNote ?? null);

	sets.push(`updated_at = now()`);
	push('updated_by', actorId);
	values.push(id);

	const db = getDb(client);
	const result = await db.query(
		`UPDATE emis.objects
		 SET ${sets.join(', ')}
		 WHERE id = $${values.length}
		   AND deleted_at IS NULL`,
		values
	);
	return (result.rowCount ?? 0) > 0;
}

export async function softDeleteObject(
	id: string,
	actorId: string | null,
	client?: PoolClient
): Promise<boolean> {
	const db = getDb(client);
	const result = await db.query(
		`UPDATE emis.objects
		 SET deleted_at = now(), updated_at = now(), deleted_by = $2, updated_by = $2
		 WHERE id = $1 AND deleted_at IS NULL`,
		[id, actorId]
	);
	return (result.rowCount ?? 0) > 0;
}
