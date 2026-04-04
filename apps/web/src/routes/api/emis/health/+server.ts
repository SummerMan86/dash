import { access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { json, type RequestHandler } from '@sveltejs/kit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../../..');

async function getSqlFiles(dirName: string): Promise<string[]> {
	const targetDir = path.join(ROOT_DIR, 'db', dirName);
	try {
		const entries = await readdir(targetDir, { withFileTypes: true });
		return entries
			.filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
			.map((entry) => entry.name)
			.sort((a, b) => a.localeCompare(b));
	} catch {
		return [];
	}
}

async function filePresent(relativePath: string): Promise<boolean> {
	try {
		await access(path.join(ROOT_DIR, relativePath));
		return true;
	} catch {
		return false;
	}
}

export const GET: RequestHandler = async () => {
	const [seeds, demoFixtures, snapshotReady, catalogReady, changesReady, pendingPatchReady] =
		await Promise.all([
			getSqlFiles('seeds'),
			getSqlFiles('demo-fixtures'),
			filePresent('db/current_schema.sql'),
			filePresent('db/schema_catalog.md'),
			filePresent('db/applied_changes.md'),
			filePresent('db/pending_changes.sql')
		]);

	return json({
		service: 'emis',
		status: 'snapshot-ready',
		db: {
			mode: 'snapshot-first',
			schemas: ['emis', 'stg_emis', 'mart_emis', 'mart'],
			baselineFile: 'db/current_schema.sql',
			schemaCatalogFile: 'db/schema_catalog.md',
			appliedChangesFile: 'db/applied_changes.md',
			pendingChangesFile: 'db/pending_changes.sql',
			baselineReady: snapshotReady,
			catalogReady,
			appliedChangesReady: changesReady,
			pendingPatchFileReady: pendingPatchReady,
			seedFiles: seeds,
			demoFixtureFiles: demoFixtures
		},
		docs: {
			bootstrap: '/docs/emis_session_bootstrap.md',
			accessModel: '/docs/emis_access_model.md',
			observability: '/docs/emis_observability_contract.md',
			readModels: '/docs/emis_read_models_contract.md',
			productContract: '/docs/emis_mve_product_contract.md',
			implementationReference: '/docs/archive/emis/emis_implementation_reference_v1.md',
			runtimeContract: '/src/lib/server/emis/infra/RUNTIME_CONTRACT.md'
		}
	});
};
