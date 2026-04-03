function normalizeBaseUrl(value: string | undefined): string | null {
	const trimmed = value?.trim();
	if (!trimmed) return null;

	try {
		const parsed = new URL(trimmed.endsWith('/') ? trimmed : `${trimmed}/`);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
		return parsed.toString();
	} catch {
		return null;
	}
}

function normalizeDocumentFile(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (!trimmed || trimmed === 'not_found_in_repository') return null;
	return trimmed.replace(/\\/g, '/').replace(/^\/+/, '');
}

function encodeDocumentPath(documentFile: string): string {
	return documentFile
		.split('/')
		.filter((segment) => segment.length > 0)
		.map((segment) => encodeURIComponent(segment))
		.join('/');
}

export function getStrategyDocumentBaseUrl(): string | null {
	return normalizeBaseUrl(process.env.STRATEGY_DOCUMENT_BASE_URL);
}

export function buildStrategyDocumentUrl(documentFile: unknown): string | null {
	const baseUrl = getStrategyDocumentBaseUrl();
	const normalizedFile = normalizeDocumentFile(documentFile);
	if (!baseUrl || !normalizedFile) return null;

	try {
		return new URL(encodeDocumentPath(normalizedFile), baseUrl).toString();
	} catch {
		return null;
	}
}
