import { readdir } from 'node:fs/promises';
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

export const GET: RequestHandler = async () => {
	const [migrations, seeds] = await Promise.all([getSqlFiles('migrations'), getSqlFiles('seeds')]);

	return json({
		service: 'emis',
		status: 'foundation-ready',
		db: {
			schema: 'emis',
			migrationFiles: migrations,
			seedFiles: seeds
		},
		docs: {
			tz: '/docs/emis_mve_tz_v_2.md',
			implementationSpec: '/docs/emis_implementation_spec_v1.md'
		}
	});
};
