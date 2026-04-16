import type { EmisMapNewsFeatureProperties } from '@dashboard-builder/emis-contracts/emis-map';
import type { EmisShipRouteVessel } from '@dashboard-builder/emis-contracts/emis-ship-route';

export type VesselRow = EmisShipRouteVessel & { vesselLabel: string };
export type NewsRow = EmisMapNewsFeatureProperties;
export type CatalogTab = 'vessels' | 'news';

export function formatCoord(value: number): string {
	return value.toFixed(4);
}

export function importanceBadge(importance: number | null): { label: string; tone: string } {
	switch (importance) {
		case 5:
			return { label: 'critical', tone: 'bg-error/15 text-error border-error/30' };
		case 4:
			return {
				label: 'high',
				tone: 'bg-destructive-hover/15 text-destructive-hover border-destructive-hover/30'
			};
		case 3:
			return { label: 'medium', tone: 'bg-warning/15 text-warning border-warning/30' };
		case 2:
			return { label: 'low', tone: 'bg-info/15 text-info border-info/30' };
		case 1:
			return { label: 'minor', tone: 'bg-success/15 text-success border-success/30' };
		default:
			return { label: 'n/a', tone: 'bg-muted/50 text-muted-foreground border-border/60' };
	}
}
