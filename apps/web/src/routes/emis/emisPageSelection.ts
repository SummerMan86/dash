import type { EmisMapSelectedFeature, EmisMapSelectedRouteFeature } from '@dashboard-builder/emis-contracts/emis-map';
import type {
	EmisShipRoutePoint,
	EmisShipRouteSegment,
	EmisShipRouteVessel
} from '@dashboard-builder/emis-contracts/emis-ship-route';

export type ShipRouteVesselOption = EmisShipRouteVessel & { vesselLabel: string };

export function getObjectDetailHref(id: string) {
	return `/emis/objects/${id}`;
}

export function getNewsDetailHref(id: string) {
	return `/emis/news/${id}`;
}

export function getSelectedFeatureHref(feature: EmisMapSelectedFeature): string | null {
	if (feature.kind === 'object') return getObjectDetailHref(feature.id);
	if (feature.kind === 'news') return getNewsDetailHref(feature.id);
	return null;
}

export function buildRoutePointSelection(point: EmisShipRoutePoint): EmisMapSelectedRouteFeature {
	return {
		kind: 'route-point',
		routePointId: point.routePointId,
		shipHbkId: point.shipHbkId,
		vesselName: point.vesselName,
		pointSeqShip: point.pointSeqShip,
		fetchedAt: point.fetchedAt,
		latitude: point.latitude,
		longitude: point.longitude,
		speed: point.speed,
		course: point.course,
		heading: point.heading
	};
}

export function buildRouteSegmentSelection(
	segment: EmisShipRouteSegment
): EmisMapSelectedRouteFeature {
	return {
		kind: 'route-segment',
		shipHbkId: segment.shipHbkId,
		vesselName: segment.vesselName,
		segmentSeqShip: segment.segmentSeqShip,
		fromFetchedAt: segment.fromFetchedAt,
		fromLatitude: segment.fromLatitude,
		fromLongitude: segment.fromLongitude,
		toLatitude: segment.toLatitude,
		toLongitude: segment.toLongitude,
		gapMinutes: segment.gapMinutes,
		fromSpeed: segment.fromSpeed,
		fromCourse: segment.fromCourse
	};
}

export function buildVesselSelectionFeature(vessel: ShipRouteVesselOption): EmisMapSelectedFeature {
	return {
		id: String(vessel.shipHbkId),
		kind: 'vessel',
		title: vessel.vesselName,
		subtitle: [vessel.vesselType, vessel.flag, vessel.callsign].filter(Boolean).join(' · ') || null,
		colorKey: 'vessel',
		shipHbkId: vessel.shipHbkId,
		imo: vessel.imo,
		mmsi: vessel.mmsi,
		flag: vessel.flag,
		callsign: vessel.callsign,
		vesselType: vessel.vesselType,
		lastFetchedAt: vessel.lastFetchedAt,
		lastLatitude: vessel.lastLatitude ?? 0,
		lastLongitude: vessel.lastLongitude ?? 0,
		pointsCount: vessel.pointsCount,
		routeDaysCount: vessel.routeDaysCount
	};
}
