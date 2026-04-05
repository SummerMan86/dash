import type {
	CreateCountryInput,
	UpdateCountryInput,
	CreateObjectTypeInput,
	UpdateObjectTypeInput,
	CreateSourceInput,
	UpdateSourceInput
} from '@dashboard-builder/emis-contracts/emis-dictionary';

import { EmisError } from '../../infra/errors';
import {
	countryExists,
	insertCountry,
	updateCountry,
	objectTypeCodeExists,
	insertObjectType,
	updateObjectType,
	getObjectType,
	sourceCodeExists,
	insertSource,
	updateSource,
	getSource
} from './repository';

// --- Countries ---

export async function createCountryService(input: CreateCountryInput) {
	if (await countryExists(input.code)) {
		throw new EmisError(409, 'COUNTRY_ALREADY_EXISTS', `Country with code "${input.code}" already exists`);
	}
	return insertCountry(input);
}

export async function updateCountryService(code: string, patch: UpdateCountryInput) {
	if (!(await countryExists(code))) {
		throw new EmisError(404, 'COUNTRY_NOT_FOUND', `Country "${code}" not found`);
	}
	const updated = await updateCountry(code, patch);
	if (!updated) {
		throw new EmisError(500, 'COUNTRY_UPDATE_FAILED', 'Failed to update country');
	}
	return updated;
}

// --- Object Types ---

export async function createObjectTypeService(input: CreateObjectTypeInput) {
	if (await objectTypeCodeExists(input.code)) {
		throw new EmisError(
			409,
			'OBJECT_TYPE_ALREADY_EXISTS',
			`Object type with code "${input.code}" already exists`
		);
	}
	return insertObjectType(input);
}

export async function updateObjectTypeService(id: string, patch: UpdateObjectTypeInput) {
	const existing = await getObjectType(id);
	if (!existing) {
		throw new EmisError(404, 'OBJECT_TYPE_NOT_FOUND', `Object type "${id}" not found`);
	}
	if (patch.code !== undefined && patch.code !== existing.code) {
		if (await objectTypeCodeExists(patch.code, id)) {
			throw new EmisError(
				409,
				'OBJECT_TYPE_CODE_CONFLICT',
				`Object type with code "${patch.code}" already exists`
			);
		}
	}
	const updated = await updateObjectType(id, patch);
	if (!updated) {
		throw new EmisError(500, 'OBJECT_TYPE_UPDATE_FAILED', 'Failed to update object type');
	}
	return updated;
}

// --- Sources ---

export async function createSourceService(input: CreateSourceInput) {
	if (await sourceCodeExists(input.code)) {
		throw new EmisError(
			409,
			'SOURCE_ALREADY_EXISTS',
			`Source with code "${input.code}" already exists`
		);
	}
	return insertSource(input);
}

export async function updateSourceService(id: string, patch: UpdateSourceInput) {
	const existing = await getSource(id);
	if (!existing) {
		throw new EmisError(404, 'SOURCE_NOT_FOUND', `Source "${id}" not found`);
	}
	if (patch.code !== undefined && patch.code !== existing.code) {
		if (await sourceCodeExists(patch.code, id)) {
			throw new EmisError(
				409,
				'SOURCE_CODE_CONFLICT',
				`Source with code "${patch.code}" already exists`
			);
		}
	}
	const updated = await updateSource(id, patch);
	if (!updated) {
		throw new EmisError(500, 'SOURCE_UPDATE_FAILED', 'Failed to update source');
	}
	return updated;
}
