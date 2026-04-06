export type EmisPointGeometry = {
	type: 'Point';
	coordinates: [number, number];
};

export type EmisLineStringGeometry = {
	type: 'LineString';
	coordinates: [number, number][];
};

export type EmisPolygonGeometry = {
	type: 'Polygon';
	coordinates: [number, number][][];
};

export type EmisMultiPointGeometry = {
	type: 'MultiPoint';
	coordinates: [number, number][];
};

export type EmisMultiLineStringGeometry = {
	type: 'MultiLineString';
	coordinates: [number, number][][];
};

export type EmisMultiPolygonGeometry = {
	type: 'MultiPolygon';
	coordinates: [number, number][][][];
};

export type EmisGeometry =
	| EmisPointGeometry
	| EmisLineStringGeometry
	| EmisPolygonGeometry
	| EmisMultiPointGeometry
	| EmisMultiLineStringGeometry
	| EmisMultiPolygonGeometry;

export type EmisGeometryType = EmisGeometry['type'];
