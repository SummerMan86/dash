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

export type EmisShipRouteVessel = {
	shipHbkId: number;
	shipId: number | null;
	imo: number | null;
	mmsi: number | null;
	vesselName: string;
	vesselType: string | null;
	flag: string | null;
	callsign: string | null;
	firstFetchedAt: string | null;
	lastFetchedAt: string;
	lastRouteDateUtc: string | null;
	pointsCount: number;
	routeDaysCount: number;
	lastLatitude: number | null;
	lastLongitude: number | null;
};
