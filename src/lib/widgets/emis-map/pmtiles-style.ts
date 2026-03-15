import { layers, namedFlavor } from '@protomaps/basemaps';
import type { StyleSpecification, SourceSpecification, LayerSpecification } from 'maplibre-gl';

const ADDRESS_LABEL_MINZOOM = 15;

export type PmtilesSourceDef = {
	url: string;
	maxzoom?: number;
};

function resolveAbsoluteUrl(url: string): string {
	if (/^https?:\/\//.test(url)) return url;
	if (typeof globalThis.location !== 'undefined') {
		return `${globalThis.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
	}
	return url;
}

export function buildPmtilesStyle({
	sources: pmtilesSources,
	glyphsUrl,
	spriteUrl
}: {
	sources: PmtilesSourceDef[];
	glyphsUrl: string;
	spriteUrl: string;
}) {
	const baseLayers = layers('protomaps', namedFlavor('light'), { lang: 'ru' });

	// Sort: broadest (lowest maxzoom) first, most detailed last
	const sorted = [...pmtilesSources].sort(
		(a, b) => (a.maxzoom ?? Number.MAX_SAFE_INTEGER) - (b.maxzoom ?? Number.MAX_SAFE_INTEGER)
	);

	const mapSources: Record<string, SourceSpecification> = {};
	const mapLayers: LayerSpecification[] = [];

	for (let i = 0; i < sorted.length; i++) {
		const src = sorted[i];
		const srcName = sorted.length === 1 ? 'protomaps' : `protomaps_${i}`;

		mapSources[srcName] = {
			type: 'vector',
			url: `pmtiles://${src.url}`,
			...(src.maxzoom !== undefined ? { maxzoom: src.maxzoom } : {}),
			attribution: i === 0 ? '&copy; OpenStreetMap contributors' : ''
		} as SourceSpecification;

		// Determine layer min zoom: detail sources start where prior source ends
		const layerMinzoom = i > 0 ? (sorted[i - 1].maxzoom ?? 0) + 1 : undefined;

		for (const layer of baseLayers) {
			const copy = structuredClone(layer) as LayerSpecification & Record<string, unknown>;
			copy.source = srcName;

			if (sorted.length > 1) {
				copy.id = `${layer.id}_${i}`;
			}

			// Constrain detail layers to start where prior source's maxzoom ends
			if (layerMinzoom !== undefined) {
				const existing = typeof copy.minzoom === 'number' ? copy.minzoom : 0;
				copy.minzoom = Math.max(existing, layerMinzoom);
			}

			// Address labels: lower minzoom from default 18
			if (layer.id === 'address_label') {
				const current = typeof copy.minzoom === 'number' ? copy.minzoom : 0;
				copy.minzoom = Math.max(current, ADDRESS_LABEL_MINZOOM);
			}

			mapLayers.push(copy);
		}
	}

	return {
		version: 8,
		glyphs: resolveAbsoluteUrl(glyphsUrl),
		sprite: resolveAbsoluteUrl(spriteUrl),
		sources: mapSources,
		layers: mapLayers
	} satisfies StyleSpecification;
}
