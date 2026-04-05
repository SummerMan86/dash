import type { ShipRouteVesselOption } from './emisPageSelection';

/**
 * Find the currently-selected vessel in the catalog by shipHbkId.
 */
export function findSelectedVessel(
	catalog: ShipRouteVesselOption[],
	shipHbkId: string
): ShipRouteVesselOption | null {
	return catalog.find((vessel) => String(vessel.shipHbkId) === shipHbkId) ?? null;
}

/**
 * Compute the fly-to target for the map when a vessel is selected.
 * Returns null if the vessel has no known position.
 */
export function getVesselFlyToTarget(
	vessel: ShipRouteVesselOption | null
): { lng: number; lat: number; zoom: number } | null {
	if (!vessel || vessel.lastLatitude === null || vessel.lastLongitude === null) return null;
	return { lng: vessel.lastLongitude, lat: vessel.lastLatitude, zoom: 6 };
}
