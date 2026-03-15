#!/usr/bin/env node
/**
 * Downloads real PMTiles assets for the EMIS spike validation wave.
 *
 * Steps:
 *   1. Install go-pmtiles CLI (if missing)
 *   2. Extract Moscow region from Protomaps daily build
 *   3. Clone fonts + sprites from protomaps/basemaps-assets (sparse checkout)
 *   4. Write manifest.json
 *
 * Usage:
 *   node scripts/emis-pmtiles-setup.mjs
 *   node scripts/emis-pmtiles-setup.mjs --source https://build.protomaps.com/20260314.pmtiles
 *   node scripts/emis-pmtiles-setup.mjs --bbox 37.3,55.55,37.85,55.92 --maxzoom 14
 */

import { existsSync, mkdirSync, cpSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

/* ------------------------------------------------------------------ */
/*  Config                                                             */
/* ------------------------------------------------------------------ */

const ROOT = process.cwd();
const OFFLINE_DIR = path.resolve(ROOT, 'static', 'emis-map', 'offline');
const BIN_DIR = path.resolve(ROOT, '.bin');

const GO_PMTILES_VERSION = '1.30.1';
const GO_PMTILES_URL = `https://github.com/protomaps/go-pmtiles/releases/download/v${GO_PMTILES_VERSION}/go-pmtiles_${GO_PMTILES_VERSION}_Linux_x86_64.tar.gz`;
const GO_PMTILES_BIN = path.join(BIN_DIR, 'pmtiles');

// Default: Moscow bounding box, zoom ≤ 14
const DEFAULT_BBOX = '37.3,55.55,37.85,55.92';
const DEFAULT_MAXZOOM = '15';

// Protomaps daily build — try yesterday if today not available yet
const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const fmtDate = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
const DEFAULT_SOURCE = `https://build.protomaps.com/${fmtDate(yesterday)}.pmtiles`;

const BASEMAPS_ASSETS_REPO = 'https://github.com/protomaps/basemaps-assets.git';

/* ------------------------------------------------------------------ */
/*  CLI arg parsing                                                    */
/* ------------------------------------------------------------------ */

function readArg(name) {
	const idx = process.argv.findIndex((a) => a === name);
	if (idx === -1) return null;
	return process.argv[idx + 1] ?? null;
}

const SOURCE_URL = readArg('--source') ?? DEFAULT_SOURCE;
const BBOX = readArg('--bbox') ?? DEFAULT_BBOX;
const MAXZOOM = readArg('--maxzoom') ?? DEFAULT_MAXZOOM;
const OUTPUT_NAME = readArg('--name') ?? 'moscow.pmtiles';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function run(cmd, opts = {}) {
	console.log(`  $ ${cmd}`);
	return execSync(cmd, { stdio: 'inherit', ...opts });
}

function section(title) {
	console.log(`\n${'='.repeat(60)}`);
	console.log(`  ${title}`);
	console.log('='.repeat(60));
}

/* ------------------------------------------------------------------ */
/*  Step 1: Install go-pmtiles CLI                                     */
/* ------------------------------------------------------------------ */

function installPmtilesCli() {
	section('Step 1: go-pmtiles CLI');

	if (existsSync(GO_PMTILES_BIN)) {
		console.log(`  Already installed at ${GO_PMTILES_BIN}`);
		run(`${GO_PMTILES_BIN} version`);
		return;
	}

	mkdirSync(BIN_DIR, { recursive: true });
	const tarPath = path.join(BIN_DIR, 'go-pmtiles.tar.gz');

	console.log(`  Downloading go-pmtiles v${GO_PMTILES_VERSION}...`);
	run(`curl -fSL -o ${tarPath} "${GO_PMTILES_URL}"`);
	run(`tar -xzf ${tarPath} -C ${BIN_DIR} pmtiles`);
	run(`chmod +x ${GO_PMTILES_BIN}`);
	run(`rm -f ${tarPath}`);
	run(`${GO_PMTILES_BIN} version`);
}

/* ------------------------------------------------------------------ */
/*  Step 2: Extract PMTiles region                                     */
/* ------------------------------------------------------------------ */

function extractRegion() {
	section('Step 2: Extract PMTiles region');

	const outputPath = path.join(OFFLINE_DIR, OUTPUT_NAME);

	if (existsSync(outputPath)) {
		console.log(`  Already exists: ${outputPath}`);
		console.log('  Delete it manually if you want to re-extract.');
		return;
	}

	console.log(`  Source:  ${SOURCE_URL}`);
	console.log(`  Bbox:    ${BBOX}`);
	console.log(`  Maxzoom: ${MAXZOOM}`);
	console.log(`  Output:  ${outputPath}`);
	console.log('');
	console.log('  This may take a minute — downloading only the tiles in bbox...');

	run(
		`${GO_PMTILES_BIN} extract "${SOURCE_URL}" "${outputPath}" --bbox="${BBOX}" --maxzoom=${MAXZOOM}`
	);

	console.log(`  Done. File: ${outputPath}`);
}

/* ------------------------------------------------------------------ */
/*  Step 3: Fonts + Sprites from basemaps-assets                       */
/* ------------------------------------------------------------------ */

function downloadAssets() {
	section('Step 3: Fonts + Sprites (protomaps/basemaps-assets)');

	const fontsDir = path.join(OFFLINE_DIR, 'fonts');
	const spritesDir = path.join(OFFLINE_DIR, 'sprites');

	// Check if fonts are already populated (more than just .gitkeep)
	const fontsPopulated =
		existsSync(fontsDir) &&
		readdirSync(fontsDir).some((e) => !e.startsWith('.') && e !== '.gitkeep');
	const spritesPopulated =
		existsSync(spritesDir) &&
		readdirSync(spritesDir).some((e) => !e.startsWith('.') && e !== '.gitkeep');

	if (fontsPopulated && spritesPopulated) {
		console.log('  Fonts and sprites already populated. Skipping.');
		return;
	}

	const tmpDir = path.join(ROOT, '.tmp-basemaps-assets');

	try {
		if (existsSync(tmpDir)) {
			rmSync(tmpDir, { recursive: true, force: true });
		}

		console.log('  Sparse-cloning protomaps/basemaps-assets (fonts + sprites/v4 only)...');
		run(
			`git clone --depth=1 --filter=blob:none --sparse "${BASEMAPS_ASSETS_REPO}" "${tmpDir}"`,
			{ cwd: ROOT }
		);
		run(`git sparse-checkout set fonts sprites/v4`, { cwd: tmpDir });

		// Copy fonts
		if (!fontsPopulated) {
			const srcFonts = path.join(tmpDir, 'fonts');
			const fontStacks = ['Noto Sans Regular', 'Noto Sans Medium', 'Noto Sans Italic'];

			for (const stack of fontStacks) {
				const srcStack = path.join(srcFonts, stack);
				const dstStack = path.join(fontsDir, stack);

				if (!existsSync(srcStack)) {
					console.log(`  WARNING: Font stack "${stack}" not found in repo`);
					continue;
				}

				mkdirSync(dstStack, { recursive: true });
				cpSync(srcStack, dstStack, { recursive: true });
				const count = readdirSync(dstStack).filter((f) => f.endsWith('.pbf')).length;
				console.log(`  Copied ${count} PBF files for "${stack}"`);
			}
		}

		// Copy sprites
		if (!spritesPopulated) {
			const srcSprites = path.join(tmpDir, 'sprites', 'v4');
			const dstSprites = path.join(spritesDir, 'v4');

			mkdirSync(dstSprites, { recursive: true });

			const lightFiles = readdirSync(srcSprites).filter((f) => f.startsWith('light'));
			for (const file of lightFiles) {
				cpSync(path.join(srcSprites, file), path.join(dstSprites, file));
				console.log(`  Copied sprite: v4/${file}`);
			}
		}
	} finally {
		// Clean up temp clone
		if (existsSync(tmpDir)) {
			rmSync(tmpDir, { recursive: true, force: true });
		}
	}
}

/* ------------------------------------------------------------------ */
/*  Step 4: Manifest                                                   */
/* ------------------------------------------------------------------ */

function writeManifest() {
	section('Step 4: manifest.json');

	const manifestPath = path.join(OFFLINE_DIR, 'manifest.json');

	const pmtilesFiles = readdirSync(OFFLINE_DIR).filter((f) =>
		f.toLowerCase().endsWith('.pmtiles')
	);
	const fontsDir = path.join(OFFLINE_DIR, 'fonts');
	const fontStacks = existsSync(fontsDir)
		? readdirSync(fontsDir).filter(
				(e) => !e.startsWith('.') && existsSync(path.join(fontsDir, e))
			)
		: [];
	const spritesDir = path.join(OFFLINE_DIR, 'sprites');
	const spriteVariants = [];
	if (existsSync(path.join(spritesDir, 'v4'))) {
		const v4Files = readdirSync(path.join(spritesDir, 'v4')).filter((f) => f.endsWith('.json'));
		for (const f of v4Files) {
			spriteVariants.push(`v4/${f.replace('.json', '')}`);
		}
	}

	const manifest = {
		version: 1,
		createdAt: new Date().toISOString(),
		source: SOURCE_URL,
		bbox: BBOX,
		maxzoom: Number(MAXZOOM),
		pmtiles: pmtilesFiles,
		fonts: fontStacks,
		sprites: spriteVariants,
		notes: 'Generated by scripts/emis-pmtiles-setup.mjs for PMTiles validation wave'
	};

	writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
	console.log(`  Written: ${manifestPath}`);
	console.log(JSON.stringify(manifest, null, 2));
}

/* ------------------------------------------------------------------ */
/*  Step 5: Summary                                                    */
/* ------------------------------------------------------------------ */

function printSummary() {
	section('Summary');

	const pmtilesFiles = readdirSync(OFFLINE_DIR).filter((f) =>
		f.toLowerCase().endsWith('.pmtiles')
	);
	const fontsDir = path.join(OFFLINE_DIR, 'fonts');
	const fontStacks = existsSync(fontsDir)
		? readdirSync(fontsDir).filter((e) => !e.startsWith('.'))
		: [];
	const spritesDir = path.join(OFFLINE_DIR, 'sprites', 'v4');
	const spriteFiles = existsSync(spritesDir)
		? readdirSync(spritesDir).filter((e) => !e.startsWith('.'))
		: [];

	console.log(`  PMTiles files: ${pmtilesFiles.join(', ') || 'none'}`);
	console.log(`  Font stacks:   ${fontStacks.join(', ') || 'none'}`);
	console.log(`  Sprite files:  ${spriteFiles.join(', ') || 'none'}`);
	console.log(`  Manifest:      ${existsSync(path.join(OFFLINE_DIR, 'manifest.json')) ? 'yes' : 'no'}`);
	console.log('');
	console.log('  Next steps:');
	console.log('    1. pnpm dev');
	console.log('    2. Open /emis/pmtiles-spike');
	console.log('    3. Verify all 4 gates in the UI');
	console.log('    4. Run: pnpm map:pmtiles:probe -- --url http://localhost:5173/emis-map/offline/' + (pmtilesFiles[0] ?? 'moscow.pmtiles'));
	console.log('');
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function main() {
	console.log('EMIS PMTiles Spike — Asset Setup');
	console.log(`  Source:    ${SOURCE_URL}`);
	console.log(`  Bbox:      ${BBOX}`);
	console.log(`  Max zoom:  ${MAXZOOM}`);
	console.log(`  Output:    ${OUTPUT_NAME}`);

	installPmtilesCli();
	extractRegion();
	downloadAssets();
	writeManifest();
	printSummary();
}

main().catch((err) => {
	console.error('\nFATAL:', err.message || err);
	process.exit(1);
});
