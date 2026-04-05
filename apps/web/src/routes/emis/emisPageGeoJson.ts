import type { EmisShipRoutePoint, EmisShipRouteSegment } from '@dashboard-builder/emis-contracts/emis-ship-route';

export function buildShipRoutePointFeatureCollection(
	points: EmisShipRoutePoint[],
	routeModeShowsPoints: boolean
): GeoJSON.FeatureCollection<GeoJSON.Point> {
	return {
		type: 'FeatureCollection',
		features: (routeModeShowsPoints ? points : []).map((point) => ({
			type: 'Feature',
			geometry: {
				type: 'Point',
				coordinates: [point.longitude, point.latitude]
			},
			properties: {
				routePointId: point.routePointId,
				shipHbkId: point.shipHbkId,
				vesselName: point.vesselName,
				pointSeqShip: point.pointSeqShip,
				fetchedAt: point.fetchedAt,
				speed: point.speed,
				course: point.course,
				heading: point.heading
			}
		}))
	};
}

export function buildShipRouteSegmentFeatureCollection(
	segments: EmisShipRouteSegment[],
	routeModeShowsSegments: boolean
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
	return {
		type: 'FeatureCollection',
		features: (routeModeShowsSegments ? segments : []).map((segment) => ({
			type: 'Feature',
			geometry: {
				type: 'LineString',
				coordinates: [
					[segment.fromLongitude, segment.fromLatitude],
					[segment.toLongitude, segment.toLatitude]
				]
			},
			properties: {
				shipHbkId: segment.shipHbkId,
				vesselName: segment.vesselName,
				segmentSeqShip: segment.segmentSeqShip,
				fromFetchedAt: segment.fromFetchedAt,
				gapMinutes: segment.gapMinutes,
				fromSpeed: segment.fromSpeed,
				fromCourse: segment.fromCourse
			}
		}))
	};
}
