import { layers, namedFlavor } from '@protomaps/basemaps';

export function buildPmtilesStyle({
	pmtilesUrl,
	glyphsUrl,
	spriteUrl
}: {
	pmtilesUrl: string;
	glyphsUrl: string;
	spriteUrl: string;
}) {
	return {
		version: 8 as const,
		glyphs: glyphsUrl,
		sprite: spriteUrl,
		sources: {
			protomaps: {
				type: 'vector' as const,
				url: `pmtiles://${pmtilesUrl}`,
				attribution: '&copy; OpenStreetMap contributors'
			}
		},
		layers: layers('protomaps', namedFlavor('light'), { lang: 'ru' })
	};
}
