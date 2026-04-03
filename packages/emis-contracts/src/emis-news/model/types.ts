import type { EmisPointGeometry } from '../../emis-geo';

export type EmisNewsSummary = {
	id: string;
	title: string;
	sourceId: string;
	sourceName: string;
	publishedAt: string;
	countryCode: string | null;
	region: string | null;
	newsType: string | null;
	importance: number | null;
	relatedObjectsCount: number;
	hasGeometry: boolean;
};

export type EmisNewsRelatedObject = {
	id: string;
	name: string;
	objectTypeCode: string;
	objectTypeName: string;
	countryCode: string | null;
	status: string;
	linkType: string;
	isPrimary: boolean;
	confidence: number | null;
	comment: string | null;
};

export type EmisNewsDetail = {
	id: string;
	source: {
		id: string;
		code: string;
		name: string;
		kind: string;
	};
	sourceItemId: string | null;
	url: string | null;
	title: string;
	summary: string | null;
	body: string | null;
	language: string | null;
	publishedAt: string;
	collectedAt: string;
	countryCode: string | null;
	region: string | null;
	newsType: string | null;
	importance: number | null;
	geometry: EmisPointGeometry | null;
	isManual: boolean;
	meta: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
	relatedObjects: EmisNewsRelatedObject[];
};

export type ListEmisNewsInput = {
	q?: string;
	source?: string;
	country?: string;
	newsType?: string;
	dateFrom?: string;
	dateTo?: string;
	objectId?: string;
	limit?: number;
	offset?: number;
};

export type CreateEmisNewsInput = {
	sourceId: string;
	sourceItemId?: string | null;
	url?: string | null;
	title: string;
	summary?: string | null;
	body?: string | null;
	language?: string | null;
	publishedAt: string;
	countryCode?: string | null;
	region?: string | null;
	newsType?: string | null;
	importance?: number | null;
	geometry?: EmisPointGeometry | null;
	isManual?: boolean;
	meta?: Record<string, unknown>;
};

export type UpdateEmisNewsInput = Partial<CreateEmisNewsInput>;
