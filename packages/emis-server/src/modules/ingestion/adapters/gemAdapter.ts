import type { EmisGeometry } from '@dashboard-builder/emis-contracts/emis-geo';

import type { NormalizedCandidate, SourceAdapter } from './types';

/**
 * GEM wiki_type → EMIS object type code mapping.
 * Isolated from transport so mapping rules are easy to review and extend.
 */
const GEM_TYPE_MAP: Record<string, string> = {
	'coal mine': 'coal_mine',
	'coal power plant': 'power_plant',
	'gas power plant': 'power_plant',
	'nuclear power plant': 'power_plant',
	'oil power plant': 'power_plant',
	'wind power plant': 'power_plant',
	'solar power plant': 'power_plant',
	'gas pipeline': 'gas_pipeline',
	'oil pipeline': 'oil_pipeline',
	'lng terminal': 'lng_terminal',
	terminal: 'terminal',
	refinery: 'refinery'
};

function mapGemGeometry(record: Record<string, unknown>): EmisGeometry | null {
	const lat = record.latitude as number | undefined;
	const lon = record.longitude as number | undefined;
	if (lat == null || lon == null) return null;
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
	return { type: 'Point', coordinates: [lon, lat] };
}

function inferGemObjectTypeCode(record: Record<string, unknown>): string | null {
	const wikiType = (record.wiki_type ?? record.type ?? '') as string;
	const normalized = wikiType.toLowerCase().trim();
	return GEM_TYPE_MAP[normalized] ?? null;
}

function normalizeGemRecord(record: Record<string, unknown>): NormalizedCandidate {
	const gemId = String(record.id ?? record.gem_id ?? '');

	return {
		sourceRef: gemId,
		rawPayload: record,
		name: (record.name_ru as string | undefined) ?? null,
		nameEn: (record.name_en ?? record.name) as string | null,
		objectTypeCode: inferGemObjectTypeCode(record),
		countryCode: (record.country_code as string | null) ?? null,
		geometry: mapGemGeometry(record)
	};
}

export const gemAdapter: SourceAdapter = {
	sourceCode: 'gem',

	async fetch(params: Record<string, unknown>): Promise<NormalizedCandidate[]> {
		const url = params.url as string | undefined;
		if (!url) throw new Error('GEM adapter requires a "url" param pointing to a GEM data export');

		const response = await fetch(url, {
			headers: { Accept: 'application/json' }
		});

		if (!response.ok) {
			throw new Error(`GEM API responded with ${response.status}: ${response.statusText}`);
		}

		const data = (await response.json()) as Record<string, unknown>[] | { data: Record<string, unknown>[] };
		const records = Array.isArray(data) ? data : (data.data ?? []);

		return (records as Record<string, unknown>[]).map(normalizeGemRecord);
	}
};
