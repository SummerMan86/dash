import type { PoolClient } from 'pg';

import type {
	EmisCountry,
	EmisObjectType,
	EmisSource,
	CreateCountryInput,
	UpdateCountryInput,
	CreateObjectTypeInput,
	UpdateObjectTypeInput,
	CreateSourceInput,
	UpdateSourceInput
} from '@dashboard-builder/emis-contracts/emis-dictionary';

import { getDb } from '../../infra/db';

export async function listCountries(client?: PoolClient): Promise<EmisCountry[]> {
	const db = getDb(client);
	const result = await db.query(
		`SELECT code, name_ru, name_en
		 FROM emis.countries
		 ORDER BY name_ru ASC`
	);
	return result.rows.map((row) => ({
		code: row.code,
		nameRu: row.name_ru,
		nameEn: row.name_en
	}));
}

export async function listObjectTypes(client?: PoolClient): Promise<EmisObjectType[]> {
	const db = getDb(client);
	const result = await db.query(
		`SELECT id, code, name, geometry_kind, icon_key, created_at
		 FROM emis.object_types
		 ORDER BY name ASC`
	);
	return result.rows.map((row) => ({
		id: row.id,
		code: row.code,
		name: row.name,
		geometryKind: row.geometry_kind,
		iconKey: row.icon_key,
		createdAt: row.created_at.toISOString()
	}));
}

export async function listSources(client?: PoolClient): Promise<EmisSource[]> {
	const db = getDb(client);
	const result = await db.query(
		`SELECT id, code, name, kind, base_url, is_active, created_at, updated_at
		 FROM emis.sources
		 ORDER BY name ASC`
	);
	return result.rows.map((row) => ({
		id: row.id,
		code: row.code,
		name: row.name,
		kind: row.kind,
		baseUrl: row.base_url,
		isActive: row.is_active,
		createdAt: row.created_at.toISOString(),
		updatedAt: row.updated_at.toISOString()
	}));
}

export async function objectTypeExists(id: string, client?: PoolClient): Promise<boolean> {
	const db = getDb(client);
	const result = await db.query('SELECT 1 FROM emis.object_types WHERE id = $1 LIMIT 1', [id]);
	return (result.rowCount ?? 0) > 0;
}

export async function sourceExists(id: string, client?: PoolClient): Promise<boolean> {
	const db = getDb(client);
	const result = await db.query('SELECT 1 FROM emis.sources WHERE id = $1 LIMIT 1', [id]);
	return (result.rowCount ?? 0) > 0;
}

export async function countryExists(code: string, client?: PoolClient): Promise<boolean> {
	const db = getDb(client);
	const result = await db.query('SELECT 1 FROM emis.countries WHERE code = $1 LIMIT 1', [code]);
	return (result.rowCount ?? 0) > 0;
}

// --- Country CRUD ---

export async function insertCountry(
	input: CreateCountryInput,
	client?: PoolClient
): Promise<EmisCountry> {
	const db = getDb(client);
	const result = await db.query(
		`INSERT INTO emis.countries (code, name_ru, name_en)
		 VALUES ($1, $2, $3)
		 RETURNING code, name_ru, name_en`,
		[input.code, input.nameRu, input.nameEn]
	);
	const row = result.rows[0];
	return { code: row.code, nameRu: row.name_ru, nameEn: row.name_en };
}

export async function updateCountry(
	code: string,
	patch: UpdateCountryInput,
	client?: PoolClient
): Promise<EmisCountry | null> {
	const db = getDb(client);
	const sets: string[] = [];
	const values: unknown[] = [];
	let idx = 1;

	if (patch.nameRu !== undefined) {
		sets.push(`name_ru = $${idx++}`);
		values.push(patch.nameRu);
	}
	if (patch.nameEn !== undefined) {
		sets.push(`name_en = $${idx++}`);
		values.push(patch.nameEn);
	}

	if (sets.length === 0) return null;

	values.push(code);
	const result = await db.query(
		`UPDATE emis.countries SET ${sets.join(', ')} WHERE code = $${idx}
		 RETURNING code, name_ru, name_en`,
		values
	);
	if (result.rowCount === 0) return null;
	const row = result.rows[0];
	return { code: row.code, nameRu: row.name_ru, nameEn: row.name_en };
}

// --- Object Type CRUD ---

export async function getObjectType(
	id: string,
	client?: PoolClient
): Promise<EmisObjectType | null> {
	const db = getDb(client);
	const result = await db.query(
		`SELECT id, code, name, geometry_kind, icon_key, created_at
		 FROM emis.object_types WHERE id = $1`,
		[id]
	);
	if (result.rowCount === 0) return null;
	const row = result.rows[0];
	return {
		id: row.id,
		code: row.code,
		name: row.name,
		geometryKind: row.geometry_kind,
		iconKey: row.icon_key,
		createdAt: row.created_at.toISOString()
	};
}

export async function insertObjectType(
	input: CreateObjectTypeInput,
	client?: PoolClient
): Promise<EmisObjectType> {
	const db = getDb(client);
	const result = await db.query(
		`INSERT INTO emis.object_types (code, name, geometry_kind, icon_key)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, code, name, geometry_kind, icon_key, created_at`,
		[input.code, input.name, input.geometryKind, input.iconKey ?? null]
	);
	const row = result.rows[0];
	return {
		id: row.id,
		code: row.code,
		name: row.name,
		geometryKind: row.geometry_kind,
		iconKey: row.icon_key,
		createdAt: row.created_at.toISOString()
	};
}

export async function updateObjectType(
	id: string,
	patch: UpdateObjectTypeInput,
	client?: PoolClient
): Promise<EmisObjectType | null> {
	const db = getDb(client);
	const sets: string[] = [];
	const values: unknown[] = [];
	let idx = 1;

	if (patch.code !== undefined) {
		sets.push(`code = $${idx++}`);
		values.push(patch.code);
	}
	if (patch.name !== undefined) {
		sets.push(`name = $${idx++}`);
		values.push(patch.name);
	}
	if (patch.geometryKind !== undefined) {
		sets.push(`geometry_kind = $${idx++}`);
		values.push(patch.geometryKind);
	}
	if (patch.iconKey !== undefined) {
		sets.push(`icon_key = $${idx++}`);
		values.push(patch.iconKey);
	}

	if (sets.length === 0) return null;

	values.push(id);
	const result = await db.query(
		`UPDATE emis.object_types SET ${sets.join(', ')} WHERE id = $${idx}
		 RETURNING id, code, name, geometry_kind, icon_key, created_at`,
		values
	);
	if (result.rowCount === 0) return null;
	const row = result.rows[0];
	return {
		id: row.id,
		code: row.code,
		name: row.name,
		geometryKind: row.geometry_kind,
		iconKey: row.icon_key,
		createdAt: row.created_at.toISOString()
	};
}

export async function objectTypeCodeExists(
	code: string,
	excludeId?: string,
	client?: PoolClient
): Promise<boolean> {
	const db = getDb(client);
	if (excludeId) {
		const result = await db.query(
			'SELECT 1 FROM emis.object_types WHERE code = $1 AND id != $2 LIMIT 1',
			[code, excludeId]
		);
		return (result.rowCount ?? 0) > 0;
	}
	const result = await db.query('SELECT 1 FROM emis.object_types WHERE code = $1 LIMIT 1', [
		code
	]);
	return (result.rowCount ?? 0) > 0;
}

// --- Source CRUD ---

export async function getSource(id: string, client?: PoolClient): Promise<EmisSource | null> {
	const db = getDb(client);
	const result = await db.query(
		`SELECT id, code, name, kind, base_url, is_active, created_at, updated_at
		 FROM emis.sources WHERE id = $1`,
		[id]
	);
	if (result.rowCount === 0) return null;
	const row = result.rows[0];
	return {
		id: row.id,
		code: row.code,
		name: row.name,
		kind: row.kind,
		baseUrl: row.base_url,
		isActive: row.is_active,
		createdAt: row.created_at.toISOString(),
		updatedAt: row.updated_at.toISOString()
	};
}

export async function insertSource(
	input: CreateSourceInput,
	client?: PoolClient
): Promise<EmisSource> {
	const db = getDb(client);
	const result = await db.query(
		`INSERT INTO emis.sources (code, name, kind, base_url, is_active)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, code, name, kind, base_url, is_active, created_at, updated_at`,
		[input.code, input.name, input.kind, input.baseUrl ?? null, input.isActive]
	);
	const row = result.rows[0];
	return {
		id: row.id,
		code: row.code,
		name: row.name,
		kind: row.kind,
		baseUrl: row.base_url,
		isActive: row.is_active,
		createdAt: row.created_at.toISOString(),
		updatedAt: row.updated_at.toISOString()
	};
}

export async function updateSource(
	id: string,
	patch: UpdateSourceInput,
	client?: PoolClient
): Promise<EmisSource | null> {
	const db = getDb(client);
	const sets: string[] = [];
	const values: unknown[] = [];
	let idx = 1;

	if (patch.code !== undefined) {
		sets.push(`code = $${idx++}`);
		values.push(patch.code);
	}
	if (patch.name !== undefined) {
		sets.push(`name = $${idx++}`);
		values.push(patch.name);
	}
	if (patch.kind !== undefined) {
		sets.push(`kind = $${idx++}`);
		values.push(patch.kind);
	}
	if (patch.baseUrl !== undefined) {
		sets.push(`base_url = $${idx++}`);
		values.push(patch.baseUrl);
	}
	if (patch.isActive !== undefined) {
		sets.push(`is_active = $${idx++}`);
		values.push(patch.isActive);
	}

	if (sets.length === 0) return null;

	// Always bump updated_at on update
	sets.push('updated_at = now()');

	values.push(id);
	const result = await db.query(
		`UPDATE emis.sources SET ${sets.join(', ')} WHERE id = $${idx}
		 RETURNING id, code, name, kind, base_url, is_active, created_at, updated_at`,
		values
	);
	if (result.rowCount === 0) return null;
	const row = result.rows[0];
	return {
		id: row.id,
		code: row.code,
		name: row.name,
		kind: row.kind,
		baseUrl: row.base_url,
		isActive: row.is_active,
		createdAt: row.created_at.toISOString(),
		updatedAt: row.updated_at.toISOString()
	};
}

export async function sourceCodeExists(
	code: string,
	excludeId?: string,
	client?: PoolClient
): Promise<boolean> {
	const db = getDb(client);
	if (excludeId) {
		const result = await db.query(
			'SELECT 1 FROM emis.sources WHERE code = $1 AND id != $2 LIMIT 1',
			[code, excludeId]
		);
		return (result.rowCount ?? 0) > 0;
	}
	const result = await db.query('SELECT 1 FROM emis.sources WHERE code = $1 LIMIT 1', [code]);
	return (result.rowCount ?? 0) > 0;
}
