import { access, cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const TARGET_DIR = path.join(ROOT_DIR, 'static', 'emis-map', 'offline');
const REQUIRED_ENTRIES = ['sprites', 'fonts'];
const PMTILES_GLOB = '.pmtiles';
const DEFAULT_GITIGNORE = '*.pmtiles\n';

async function pathExists(targetPath) {
	try {
		await access(targetPath);
		return true;
	} catch {
		return false;
	}
}

async function hasVisibleEntries(targetPath) {
	try {
		const entries = await readdir(targetPath);
		return entries.some((entry) => !entry.startsWith('.'));
	} catch {
		return false;
	}
}

async function listPmtilesFiles(baseDir) {
	try {
		const entries = await readdir(baseDir, { withFileTypes: true });
		return entries
			.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(PMTILES_GLOB))
			.map((entry) => entry.name)
			.sort((left, right) => left.localeCompare(right));
	} catch {
		return [];
	}
}

async function hasRecognizedSpriteRoot(baseDir) {
	const candidates = [
		path.join(baseDir, 'sprites', 'v4', 'light.json'),
		path.join(baseDir, 'sprites', 'light.json'),
		path.join(baseDir, 'sprites', 'sprite.json')
	];

	for (const candidate of candidates) {
		if (await pathExists(candidate)) {
			return true;
		}
	}

	return false;
}

async function readManifest(baseDir) {
	const manifestPath = path.join(baseDir, 'manifest.json');
	if (!(await pathExists(manifestPath))) {
		return null;
	}

	try {
		return JSON.parse(await readFile(manifestPath, 'utf8'));
	} catch {
		return null;
	}
}

async function getBundleStatus(baseDir) {
	const pmtilesFiles = await listPmtilesFiles(baseDir);
	const sprites = await hasVisibleEntries(path.join(baseDir, 'sprites'));
	const spriteRoot = await hasRecognizedSpriteRoot(baseDir);
	const fonts = await hasVisibleEntries(path.join(baseDir, 'fonts'));
	const manifestExists = await pathExists(path.join(baseDir, 'manifest.json'));
	const manifest = await readManifest(baseDir);

	return {
		baseDir,
		pmtiles: pmtilesFiles.length > 0,
		pmtilesFiles,
		sprites,
		spriteRoot,
		fonts,
		manifest: manifestExists && Boolean(manifest),
		manifestExists,
		manifestData: manifest
	};
}

function printUsage() {
	console.log('Usage:');
	console.log('  pnpm map:assets:status');
	console.log('  pnpm map:assets:install -- --source /abs/path/to/offline-bundle');
}

function readOption(name) {
	const optionIndex = process.argv.findIndex((arg) => arg === name);
	if (optionIndex === -1) return null;
	return process.argv[optionIndex + 1] ?? null;
}

async function ensureRequiredSourceStructure(sourceDir) {
	for (const entry of REQUIRED_ENTRIES) {
		const target = path.join(sourceDir, entry);
		const exists = await pathExists(target);
		if (!exists) {
			throw new Error(`Missing required offline map asset: ${entry}`);
		}
	}

	const pmtilesFiles = await listPmtilesFiles(sourceDir);
	if (!pmtilesFiles.length) {
		throw new Error('Missing required offline map asset: at least one .pmtiles file');
	}

	if (!(await hasRecognizedSpriteRoot(sourceDir))) {
		throw new Error(
			'Missing compatible sprite manifest (expected sprites/v4/light.json or equivalent)'
		);
	}
}

async function installBundle(sourceDir) {
	const sourcePath = path.resolve(sourceDir);
	await ensureRequiredSourceStructure(sourcePath);

	await rm(TARGET_DIR, { recursive: true, force: true });
	await mkdir(TARGET_DIR, { recursive: true });

	await cp(sourcePath, TARGET_DIR, {
		recursive: true,
		force: true
	});

	const pmtilesFiles = await listPmtilesFiles(TARGET_DIR);
	const manifestPath = path.join(TARGET_DIR, 'manifest.json');
	let existingManifest = {};
	if (await pathExists(manifestPath)) {
		try {
			existingManifest = JSON.parse(await readFile(manifestPath, 'utf8'));
		} catch {
			existingManifest = {};
		}
	}

	const manifest = {
		...existingManifest,
		version:
			typeof existingManifest === 'object' &&
			existingManifest &&
			'version' in existingManifest &&
			typeof existingManifest.version === 'number'
				? existingManifest.version
				: 1,
		pmtiles:
			typeof existingManifest === 'object' &&
			existingManifest &&
			'pmtiles' in existingManifest &&
			Array.isArray(existingManifest.pmtiles)
				? existingManifest.pmtiles
				: pmtilesFiles,
		installedAt: new Date().toISOString(),
		sourcePath,
		requiredEntries: [...REQUIRED_ENTRIES, 'manifest.json', '*.pmtiles']
	};

	await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
	await writeFile(path.join(TARGET_DIR, '.gitignore'), DEFAULT_GITIGNORE, 'utf8');

	const status = await getBundleStatus(TARGET_DIR);
	console.log(JSON.stringify({ installed: true, targetDir: TARGET_DIR, status }, null, 2));
}

async function printStatus() {
	const status = await getBundleStatus(TARGET_DIR);
	const ready = Boolean(
		status.pmtiles && status.sprites && status.spriteRoot && status.fonts && status.manifest
	);
	console.log(JSON.stringify({ ready, targetDir: TARGET_DIR, status }, null, 2));
	process.exitCode = ready ? 0 : 1;
}

async function main() {
	const command = process.argv[2];

	if (!command || command === '--help' || command === '-h') {
		printUsage();
		return;
	}

	if (command === 'status') {
		await printStatus();
		return;
	}

	if (command === 'install') {
		const sourceDir = readOption('--source');
		if (!sourceDir) {
			throw new Error('Missing required option --source /abs/path/to/offline-bundle');
		}
		await installBundle(sourceDir);
		return;
	}

	throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
