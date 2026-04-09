import { fail } from '@sveltejs/kit';
import { ZodError } from 'zod';

import type {
	EmisCountry,
	EmisObjectType,
	EmisSource
} from '@dashboard-builder/emis-contracts/emis-dictionary';
import type { CreateEmisNewsInput } from '@dashboard-builder/emis-contracts/emis-news';
import type { CreateEmisObjectInput } from '@dashboard-builder/emis-contracts/emis-object';
import { isEmisError } from '$lib/server/emis/infra/errors';
import {
	listCountries,
	listObjectTypes,
	listSources
} from '$lib/server/emis/modules/dictionaries/repository';

export type FieldErrors = Record<string, string>;

export type ObjectFormValues = {
	externalId: string;
	objectTypeId: string;
	name: string;
	nameEn: string;
	countryCode: string;
	region: string;
	status: string;
	operatorName: string;
	description: string;
	sourceNote: string;
	latitude: string;
	longitude: string;
	attributesJson: string;
};

export type NewsFormValues = {
	sourceId: string;
	sourceItemId: string;
	url: string;
	title: string;
	summary: string;
	body: string;
	language: string;
	publishedAt: string;
	countryCode: string;
	region: string;
	newsType: string;
	importance: string;
	latitude: string;
	longitude: string;
	isManual: boolean;
	metaJson: string;
};

export type ObjectEditorDictionaries = {
	countries: EmisCountry[];
	objectTypes: EmisObjectType[];
};

export type NewsEditorDictionaries = {
	countries: EmisCountry[];
	sources: EmisSource[];
};

class FormParseError extends Error {
	status: number;
	field?: string;

	constructor(message: string, status = 400, field?: string) {
		super(message);
		this.name = 'FormParseError';
		this.status = status;
		this.field = field;
	}
}

class FieldValidationError extends Error {
	fieldErrors: FieldErrors;

	constructor(fieldErrors: FieldErrors) {
		super('Validation failed');
		this.name = 'FieldValidationError';
		this.fieldErrors = fieldErrors;
	}
}

function requiredText(formData: FormData, key: string, label: string) {
	const value = formData.get(key);
	const text = typeof value === 'string' ? value.trim() : '';
	if (!text) throw new FormParseError(`${label} is required`);
	return text;
}

function optionalText(formData: FormData, key: string) {
	const value = formData.get(key);
	if (typeof value !== 'string') return '';
	return value.trim();
}

function nullableText(formData: FormData, key: string) {
	const value = optionalText(formData, key);
	return value || null;
}

function parseNumberField(value: string, label: string, field?: string) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed))
		throw new FormParseError(`${label} must be a valid number`, 400, field);
	return parsed;
}

function parseJsonRecord(text: string, label: string, field?: string) {
	if (!text.trim()) return {};

	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new FormParseError(`${label} must be valid JSON`, 400, field);
	}

	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new FormParseError(`${label} must be a JSON object`, 400, field);
	}

	return parsed as Record<string, unknown>;
}

function normalizeDateTimeInput(value: string, label: string, field?: string) {
	if (!value.trim()) throw new FormParseError(`${label} is required`, 400, field);
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime()))
		throw new FormParseError(`${label} must be a valid datetime`, 400, field);
	return parsed.toISOString();
}

function toDateTimeLocal(value: string | null | undefined) {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function createObjectFormDefaults(): ObjectFormValues {
	return {
		externalId: '',
		objectTypeId: '',
		name: '',
		nameEn: '',
		countryCode: '',
		region: '',
		status: 'active',
		operatorName: '',
		description: '',
		sourceNote: '',
		latitude: '',
		longitude: '',
		attributesJson: '{}'
	};
}

export function createNewsFormDefaults(): NewsFormValues {
	return {
		sourceId: '',
		sourceItemId: '',
		url: '',
		title: '',
		summary: '',
		body: '',
		language: '',
		publishedAt: '',
		countryCode: '',
		region: '',
		newsType: '',
		importance: '',
		latitude: '',
		longitude: '',
		isManual: true,
		metaJson: '{}'
	};
}

export function objectDetailToFormValues(detail: {
	externalId: string | null;
	objectType: { id: string };
	name: string;
	nameEn: string | null;
	countryCode: string | null;
	region: string | null;
	status: string;
	operatorName: string | null;
	description: string | null;
	sourceNote: string | null;
	attributes: Record<string, unknown>;
	geometry: { type: string; coordinates: unknown };
}): ObjectFormValues {
	const isPoint = detail.geometry.type === 'Point';
	const coords = isPoint ? (detail.geometry.coordinates as [number, number]) : null;

	return {
		externalId: detail.externalId ?? '',
		objectTypeId: detail.objectType.id,
		name: detail.name,
		nameEn: detail.nameEn ?? '',
		countryCode: detail.countryCode ?? '',
		region: detail.region ?? '',
		status: detail.status,
		operatorName: detail.operatorName ?? '',
		description: detail.description ?? '',
		sourceNote: detail.sourceNote ?? '',
		latitude: coords ? String(coords[1]) : '',
		longitude: coords ? String(coords[0]) : '',
		attributesJson: JSON.stringify(detail.attributes, null, 2)
	};
}

export function newsDetailToFormValues(detail: {
	source: { id: string };
	sourceItemId: string | null;
	url: string | null;
	title: string;
	summary: string | null;
	body: string | null;
	language: string | null;
	publishedAt: string;
	countryCode: string | null;
	region: string | null;
	newsType: string | null;
	importance: number | null;
	geometry: { coordinates: [number, number] } | null;
	isManual: boolean;
	meta: Record<string, unknown>;
}): NewsFormValues {
	return {
		sourceId: detail.source.id,
		sourceItemId: detail.sourceItemId ?? '',
		url: detail.url ?? '',
		title: detail.title,
		summary: detail.summary ?? '',
		body: detail.body ?? '',
		language: detail.language ?? '',
		publishedAt: toDateTimeLocal(detail.publishedAt),
		countryCode: detail.countryCode ?? '',
		region: detail.region ?? '',
		newsType: detail.newsType ?? '',
		importance: detail.importance === null ? '' : String(detail.importance),
		latitude: detail.geometry ? String(detail.geometry.coordinates[1]) : '',
		longitude: detail.geometry ? String(detail.geometry.coordinates[0]) : '',
		isManual: detail.isManual,
		metaJson: JSON.stringify(detail.meta, null, 2)
	};
}

export function readObjectFormValues(formData: FormData): ObjectFormValues {
	return {
		externalId: optionalText(formData, 'externalId'),
		objectTypeId: optionalText(formData, 'objectTypeId'),
		name: optionalText(formData, 'name'),
		nameEn: optionalText(formData, 'nameEn'),
		countryCode: optionalText(formData, 'countryCode'),
		region: optionalText(formData, 'region'),
		status: optionalText(formData, 'status'),
		operatorName: optionalText(formData, 'operatorName'),
		description: optionalText(formData, 'description'),
		sourceNote: optionalText(formData, 'sourceNote'),
		latitude: optionalText(formData, 'latitude'),
		longitude: optionalText(formData, 'longitude'),
		attributesJson: optionalText(formData, 'attributesJson') || '{}'
	};
}

export function readNewsFormValues(formData: FormData): NewsFormValues {
	return {
		sourceId: optionalText(formData, 'sourceId'),
		sourceItemId: optionalText(formData, 'sourceItemId'),
		url: optionalText(formData, 'url'),
		title: optionalText(formData, 'title'),
		summary: optionalText(formData, 'summary'),
		body: optionalText(formData, 'body'),
		language: optionalText(formData, 'language'),
		publishedAt: optionalText(formData, 'publishedAt'),
		countryCode: optionalText(formData, 'countryCode'),
		region: optionalText(formData, 'region'),
		newsType: optionalText(formData, 'newsType'),
		importance: optionalText(formData, 'importance'),
		latitude: optionalText(formData, 'latitude'),
		longitude: optionalText(formData, 'longitude'),
		isManual: formData.get('isManual') !== null,
		metaJson: optionalText(formData, 'metaJson') || '{}'
	};
}

export function parseObjectForm(values: ObjectFormValues): CreateEmisObjectInput {
	if (!values.objectTypeId)
		throw new FormParseError('Object type is required', 400, 'objectTypeId');
	if (!values.name) throw new FormParseError('Name is required', 400, 'name');

	const longitude = parseNumberField(values.longitude, 'Longitude', 'longitude');
	const latitude = parseNumberField(values.latitude, 'Latitude', 'latitude');

	return {
		externalId: values.externalId || null,
		objectTypeId: values.objectTypeId,
		name: values.name,
		nameEn: values.nameEn || null,
		countryCode: values.countryCode || null,
		region: values.region || null,
		status: values.status as CreateEmisObjectInput['status'],
		operatorName: values.operatorName || null,
		description: values.description || null,
		attributes: parseJsonRecord(values.attributesJson, 'Attributes', 'attributesJson'),
		geometry: {
			type: 'Point',
			coordinates: [longitude, latitude]
		},
		sourceNote: values.sourceNote || null
	};
}

/** Like parseObjectForm but omits geometry fields — safe for non-point object updates. */
export function parseObjectFormWithoutGeometry(
	values: ObjectFormValues
): Omit<CreateEmisObjectInput, 'geometry'> {
	if (!values.objectTypeId)
		throw new FormParseError('Object type is required', 400, 'objectTypeId');
	if (!values.name) throw new FormParseError('Name is required', 400, 'name');

	return {
		externalId: values.externalId || null,
		objectTypeId: values.objectTypeId,
		name: values.name,
		nameEn: values.nameEn || null,
		countryCode: values.countryCode || null,
		region: values.region || null,
		status: values.status as CreateEmisObjectInput['status'],
		operatorName: values.operatorName || null,
		description: values.description || null,
		attributes: parseJsonRecord(values.attributesJson, 'Attributes', 'attributesJson'),
		sourceNote: values.sourceNote || null
	};
}

export function parseNewsForm(values: NewsFormValues): CreateEmisNewsInput {
	if (!values.sourceId) throw new FormParseError('Source is required', 400, 'sourceId');
	if (!values.title) throw new FormParseError('Title is required', 400, 'title');

	const hasLat = values.latitude.trim().length > 0;
	const hasLon = values.longitude.trim().length > 0;
	if (hasLat !== hasLon) {
		throw new FormParseError('Latitude and longitude must be filled together', 400, 'latitude');
	}

	return {
		sourceId: values.sourceId,
		sourceItemId: values.sourceItemId || null,
		url: values.url || null,
		title: values.title,
		summary: values.summary || null,
		body: values.body || null,
		language: values.language || null,
		publishedAt: normalizeDateTimeInput(values.publishedAt, 'Published at', 'publishedAt'),
		countryCode: values.countryCode || null,
		region: values.region || null,
		newsType: values.newsType || null,
		importance: values.importance
			? parseNumberField(values.importance, 'Importance', 'importance')
			: null,
		geometry:
			hasLat && hasLon
				? {
						type: 'Point',
						coordinates: [
							parseNumberField(values.longitude, 'Longitude', 'longitude'),
							parseNumberField(values.latitude, 'Latitude', 'latitude')
						]
					}
				: null,
		isManual: values.isManual,
		meta: parseJsonRecord(values.metaJson, 'Meta', 'metaJson')
	};
}

export function ensureObjectFormRequired(values: ObjectFormValues) {
	const errors: FieldErrors = {};
	if (!values.objectTypeId) errors.objectTypeId = 'Object type is required';
	if (!values.name) errors.name = 'Name is required';
	if (!values.status) errors.status = 'Status is required';
	if (!values.latitude) errors.latitude = 'Latitude is required';
	if (!values.longitude) errors.longitude = 'Longitude is required';
	if (Object.keys(errors).length > 0) throw new FieldValidationError(errors);
}

export function ensureNewsFormRequired(values: NewsFormValues) {
	const errors: FieldErrors = {};
	if (!values.sourceId) errors.sourceId = 'Source is required';
	if (!values.title) errors.title = 'Title is required';
	if (!values.publishedAt) errors.publishedAt = 'Published at is required';
	if (Object.keys(errors).length > 0) throw new FieldValidationError(errors);
}

export async function loadObjectEditorDictionaries(): Promise<ObjectEditorDictionaries> {
	const [countries, objectTypes] = await Promise.all([listCountries(), listObjectTypes()]);
	return { countries, objectTypes };
}

export async function loadNewsEditorDictionaries(): Promise<NewsEditorDictionaries> {
	const [countries, sources] = await Promise.all([listCountries(), listSources()]);
	return { countries, sources };
}

function zodPathToFormField(path: (string | number)[]): string | null {
	const joined = path.join('.');
	if (joined === 'geometry.coordinates.0') return 'longitude';
	if (joined === 'geometry.coordinates.1') return 'latitude';
	if (joined === 'geometry') return 'latitude';
	if (joined === 'attributes') return 'attributesJson';
	if (joined === 'meta') return 'metaJson';
	// Nested array items: links.0.objectId → objectId
	if (path[0] === 'links' && typeof path[1] === 'number' && typeof path[2] === 'string') {
		return path[2];
	}
	if (path.length === 1 && typeof path[0] === 'string') return path[0];
	return null;
}

function extractZodFieldErrors(zodError: ZodError): FieldErrors {
	const errors: FieldErrors = {};
	for (const issue of zodError.issues) {
		const field = zodPathToFormField(issue.path);
		if (field && !errors[field]) {
			errors[field] = issue.message;
		}
	}
	return errors;
}

export function actionFailure(error: unknown, values: Record<string, unknown>, action?: string) {
	const base = action ? { action } : {};

	if (error instanceof FieldValidationError) {
		return fail(400, { ...base, fieldErrors: error.fieldErrors, formError: null, values });
	}

	if (error instanceof ZodError) {
		const fieldErrors = extractZodFieldErrors(error);
		const formError =
			Object.keys(fieldErrors).length === 0
				? (error.issues[0]?.message ?? 'Validation failed')
				: null;
		return fail(400, { ...base, fieldErrors, formError, values });
	}

	if (error instanceof FormParseError) {
		const fieldErrors: FieldErrors = {};
		if (error.field) fieldErrors[error.field] = error.message;
		return fail(error.status, {
			...base,
			fieldErrors,
			formError: error.field ? null : error.message,
			values
		});
	}

	if (isEmisError(error)) {
		return fail(error.status, {
			...base,
			fieldErrors: {} as FieldErrors,
			formError: error.message,
			values
		});
	}

	if (error instanceof Error) {
		return fail(500, { ...base, fieldErrors: {} as FieldErrors, formError: error.message, values });
	}

	return fail(500, {
		...base,
		fieldErrors: {} as FieldErrors,
		formError: 'Unexpected EMIS form error',
		values
	});
}
