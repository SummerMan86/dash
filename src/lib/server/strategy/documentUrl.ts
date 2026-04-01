function normalizeDocumentPath(documentFile: string): string | null {
	const normalized = documentFile
		.trim()
		.replace(/\\/g, '/')
		.replace(/^\/+|\/+$/g, '');
	if (!normalized) return null;
	if (normalized === 'not_found_in_repository') return null;
	return normalized;
}

export function getStrategyDocumentBaseUrl(): string | null {
	const raw = process.env.STRATEGY_DOCUMENT_BASE_URL?.trim();
	if (!raw) return null;
	return raw.replace(/\/+$/g, '');
}

export function buildStrategyDocumentUrl(documentFile: string | null | undefined): string | null {
	if (!documentFile) return null;

	const trimmed = documentFile.trim();
	if (!trimmed) return null;
	if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) return trimmed;

	const baseUrl = getStrategyDocumentBaseUrl();
	const normalizedPath = normalizeDocumentPath(trimmed);
	if (!baseUrl || !normalizedPath) return null;

	const encodedPath = normalizedPath.split('/').map(encodeURIComponent).join('/');
	return `${baseUrl}/${encodedPath}`;
}
