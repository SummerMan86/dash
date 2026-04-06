import type { EmisGeometry } from '@dashboard-builder/emis-contracts/emis-geo';

/** Normalized candidate from any external source, before DB insertion. */
export type NormalizedCandidate = {
	sourceRef: string;
	rawPayload: Record<string, unknown>;
	name: string | null;
	nameEn: string | null;
	objectTypeCode: string | null;
	countryCode: string | null;
	geometry: EmisGeometry | null;
};

/** Generic source adapter interface. All source adapters must implement this. */
export type SourceAdapter = {
	readonly sourceCode: string;
	fetch(params: Record<string, unknown>): Promise<NormalizedCandidate[]>;
};
