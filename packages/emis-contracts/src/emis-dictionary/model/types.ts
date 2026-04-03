export type EmisCountry = {
	code: string;
	nameRu: string;
	nameEn: string;
};

export type EmisObjectType = {
	id: string;
	code: string;
	name: string;
	geometryKind: 'point' | 'linestring' | 'polygon' | 'mixed';
	iconKey: string | null;
	createdAt: string;
};

export type EmisSource = {
	id: string;
	code: string;
	name: string;
	kind: string;
	baseUrl: string | null;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
};
