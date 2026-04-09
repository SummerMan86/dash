import type { SourceAdapter } from './types';
import { gemAdapter } from './gemAdapter';
import { osmAdapter } from './osmAdapter';

const adapters = new Map<string, SourceAdapter>([
	[osmAdapter.sourceCode, osmAdapter],
	[gemAdapter.sourceCode, gemAdapter]
]);

export function getSourceAdapter(sourceCode: string): SourceAdapter {
	const adapter = adapters.get(sourceCode);
	if (!adapter) {
		throw new Error(`No adapter registered for source "${sourceCode}"`);
	}
	return adapter;
}

export function listRegisteredSources(): string[] {
	return [...adapters.keys()];
}
