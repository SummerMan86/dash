/**
 * Pure functions that validate and normalize raw GeoJSON feature properties
 * into strongly-typed EMIS map feature shapes.
 *
 * Extracted from EmisMap.svelte to reduce component size and improve testability.
 */

import type {
	EmisMapObjectFeatureProperties,
	EmisMapNewsFeatureProperties,
	EmisMapVesselFeatureProperties,
	EmisMapSelectedRouteFeature
} from '@dashboard-builder/emis-contracts/emis-map';

export function normalizeObjectFeature(
	properties: GeoJSON.GeoJsonProperties | null | undefined
): EmisMapObjectFeatureProperties | null {
	if (
		!properties ||
		typeof properties.id !== 'string' ||
		typeof properties.title !== 'string' ||
		typeof properties.objectTypeId !== 'string' ||
		typeof properties.objectTypeCode !== 'string' ||
		typeof properties.objectTypeName !== 'string' ||
		typeof properties.status !== 'string' ||
		typeof properties.updatedAt !== 'string'
	) {
		return null;
	}

	return {
		id: properties.id,
		kind: 'object',
		title: properties.title,
		subtitle: typeof properties.subtitle === 'string' ? properties.subtitle : null,
		colorKey: typeof properties.colorKey === 'string' ? properties.colorKey : 'object',
		objectTypeId: properties.objectTypeId,
		objectTypeCode: properties.objectTypeCode,
		objectTypeName: properties.objectTypeName,
		countryCode: typeof properties.countryCode === 'string' ? properties.countryCode : null,
		region: typeof properties.region === 'string' ? properties.region : null,
		status: properties.status,
		updatedAt: properties.updatedAt
	};
}

export function normalizeNewsFeature(
	properties: GeoJSON.GeoJsonProperties | null | undefined
): EmisMapNewsFeatureProperties | null {
	if (
		!properties ||
		typeof properties.id !== 'string' ||
		typeof properties.title !== 'string' ||
		typeof properties.sourceId !== 'string' ||
		typeof properties.sourceName !== 'string' ||
		typeof properties.publishedAt !== 'string'
	) {
		return null;
	}

	return {
		id: properties.id,
		kind: 'news',
		title: properties.title,
		subtitle: typeof properties.subtitle === 'string' ? properties.subtitle : null,
		colorKey: typeof properties.colorKey === 'string' ? properties.colorKey : 'news',
		sourceId: properties.sourceId,
		sourceName: properties.sourceName,
		countryCode: typeof properties.countryCode === 'string' ? properties.countryCode : null,
		region: typeof properties.region === 'string' ? properties.region : null,
		newsType: typeof properties.newsType === 'string' ? properties.newsType : null,
		importance: typeof properties.importance === 'number' ? properties.importance : null,
		publishedAt: properties.publishedAt,
		relatedObjectsCount:
			typeof properties.relatedObjectsCount === 'number' ? properties.relatedObjectsCount : 0,
		summary: typeof properties.summary === 'string' ? properties.summary : null,
		url: typeof properties.url === 'string' ? properties.url : null
	};
}

export function normalizeVesselFeature(
	properties: GeoJSON.GeoJsonProperties | null | undefined
): EmisMapVesselFeatureProperties | null {
	if (
		!properties ||
		typeof properties.id !== 'string' ||
		typeof properties.title !== 'string' ||
		typeof properties.shipHbkId !== 'number' ||
		typeof properties.lastFetchedAt !== 'string' ||
		typeof properties.lastLatitude !== 'number' ||
		typeof properties.lastLongitude !== 'number'
	) {
		return null;
	}

	return {
		id: properties.id,
		kind: 'vessel',
		title: properties.title,
		subtitle: typeof properties.subtitle === 'string' ? properties.subtitle : null,
		colorKey: typeof properties.colorKey === 'string' ? properties.colorKey : 'vessel',
		shipHbkId: properties.shipHbkId,
		imo: typeof properties.imo === 'number' ? properties.imo : null,
		mmsi: typeof properties.mmsi === 'number' ? properties.mmsi : null,
		flag: typeof properties.flag === 'string' ? properties.flag : null,
		callsign: typeof properties.callsign === 'string' ? properties.callsign : null,
		vesselType: typeof properties.vesselType === 'string' ? properties.vesselType : null,
		lastFetchedAt: properties.lastFetchedAt,
		lastLatitude: properties.lastLatitude,
		lastLongitude: properties.lastLongitude,
		pointsCount: typeof properties.pointsCount === 'number' ? properties.pointsCount : 0,
		routeDaysCount: typeof properties.routeDaysCount === 'number' ? properties.routeDaysCount : 0
	};
}

export function normalizeRoutePointFeature(
	properties: GeoJSON.GeoJsonProperties | null | undefined,
	geometry: GeoJSON.Geometry | null | undefined
): EmisMapSelectedRouteFeature | null {
	if (
		!properties ||
		typeof properties.routePointId !== 'number' ||
		typeof properties.shipHbkId !== 'number' ||
		typeof properties.vesselName !== 'string' ||
		typeof properties.pointSeqShip !== 'number' ||
		typeof properties.fetchedAt !== 'string' ||
		!geometry ||
		geometry.type !== 'Point'
	) {
		return null;
	}

	return {
		kind: 'route-point',
		routePointId: properties.routePointId,
		shipHbkId: properties.shipHbkId,
		vesselName: properties.vesselName,
		pointSeqShip: properties.pointSeqShip,
		fetchedAt: properties.fetchedAt,
		latitude: Number(geometry.coordinates[1]),
		longitude: Number(geometry.coordinates[0]),
		speed: typeof properties.speed === 'number' ? properties.speed : null,
		course: typeof properties.course === 'number' ? properties.course : null,
		heading: typeof properties.heading === 'number' ? properties.heading : null
	};
}

export function normalizeRouteSegmentFeature(
	properties: GeoJSON.GeoJsonProperties | null | undefined,
	geometry: GeoJSON.Geometry | null | undefined
): EmisMapSelectedRouteFeature | null {
	if (
		!properties ||
		typeof properties.shipHbkId !== 'number' ||
		typeof properties.vesselName !== 'string' ||
		typeof properties.segmentSeqShip !== 'number' ||
		typeof properties.fromFetchedAt !== 'string' ||
		!geometry ||
		geometry.type !== 'LineString' ||
		geometry.coordinates.length < 2
	) {
		return null;
	}

	return {
		kind: 'route-segment',
		shipHbkId: properties.shipHbkId,
		vesselName: properties.vesselName,
		segmentSeqShip: properties.segmentSeqShip,
		fromFetchedAt: properties.fromFetchedAt,
		fromLatitude: Number(geometry.coordinates[0][1]),
		fromLongitude: Number(geometry.coordinates[0][0]),
		toLatitude: Number(geometry.coordinates[geometry.coordinates.length - 1][1]),
		toLongitude: Number(geometry.coordinates[geometry.coordinates.length - 1][0]),
		gapMinutes: typeof properties.gapMinutes === 'number' ? properties.gapMinutes : null,
		fromSpeed: typeof properties.fromSpeed === 'number' ? properties.fromSpeed : null,
		fromCourse: typeof properties.fromCourse === 'number' ? properties.fromCourse : null
	};
}
