import { access, cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const TARGET_DIR = path.join(ROOT_DIR, 'static', 'emis-map', 'offline');
const REQUIRED_ENTRIES = ['style.json', 'tiles', 'sprites', 'fonts'];

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

async function getBundleStatus(baseDir) {
	const stylePath = path.join(baseDir, 'style.json');
	const tilesPath = path.join(baseDir, 'tiles');
	const spritesPath = path.join(baseDir, 'sprites');
	const fontsPath = path.join(baseDir, 'fonts');
	const manifestPath = path.join(baseDir, 'manifest.json');

	return {
		baseDir,
		style: await pathExists(stylePath),
		tiles: await hasVisibleEntries(tilesPath),
		sprites: await hasVisibleEntries(spritesPath),
		fonts: await hasVisibleEntries(fontsPath),
		manifest: await pathExists(manifestPath)
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

	const styleStat = await stat(path.join(sourceDir, 'style.json'));
	if (!styleStat.isFile()) {
		throw new Error('style.json must be a file');
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
		installedAt: new Date().toISOString(),
		sourcePath,
		requiredEntries: REQUIRED_ENTRIES
	};
	await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

	const status = await getBundleStatus(TARGET_DIR);
	console.log(JSON.stringify({ installed: true, targetDir: TARGET_DIR, status }, null, 2));
}

async function printStatus() {
	const status = await getBundleStatus(TARGET_DIR);
	const ready = status.style && status.tiles && status.sprites && status.fonts;
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
