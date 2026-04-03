import type { EmisPointGeometry } from '../../emis-geo';

export type EmisObjectStatus = 'active' | 'inactive' | 'planned' | 'archived';

export type EmisObjectSummary = {
	id: string;
	name: string;
	objectTypeId: string;
	objectTypeCode: string;
	objectTypeName: string;
	countryCode: string | null;
	region: string | null;
	status: string;
	hasGeometry: boolean;
	updatedAt: string;
};

export type EmisObjectRelatedNews = {
	id: string;
	title: string;
	sourceName: string;
	publishedAt: string;
	newsType: string | null;
	importance: number | null;
	linkType: string;
	isPrimary: boolean;
	confidence: number | null;
	comment: string | null;
};

export type EmisObjectDetail = {
	id: string;
	externalId: string | null;
	name: string;
	nameEn: string | null;
	objectType: {
		id: string;
		code: string;
		name: string;
	};
	countryCode: string | null;
	region: string | null;
	status: string;
	operatorName: string | null;
	description: string | null;
	attributes: Record<string, unknown>;
	geometry: EmisPointGeometry;
	sourceNote: string | null;
	createdAt: string;
	updatedAt: string;
	relatedNews: EmisObjectRelatedNews[];
};

export type ListEmisObjectsInput = {
	q?: string;
	objectType?: string;
	country?: string;
	status?: string;
	limit?: number;
	offset?: number;
};

export type CreateEmisObjectInput = {
	externalId?: string | null;
	objectTypeId: string;
	name: string;
	nameEn?: string | null;
	countryCode?: string | null;
	region?: string | null;
	status?: EmisObjectStatus;
	operatorName?: string | null;
	description?: string | null;
	attributes?: Record<string, unknown>;
	geometry: EmisPointGeometry;
	sourceNote?: string | null;
};

export type UpdateEmisObjectInput = Partial<
	Omit<CreateEmisObjectInput, 'geometry' | 'objectTypeId' | 'name'>
> & {
	objectTypeId?: string;
	name?: string;
	geometry?: EmisPointGeometry;
};
