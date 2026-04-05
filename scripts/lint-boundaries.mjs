/**
 * Boundary-only lint verification.
 *
 * Runs ESLint on directories where boundary rules apply and reports
 * ONLY no-restricted-imports violations, filtering out all other lint noise.
 *
 * Usage: node scripts/lint-boundaries.mjs
 *        pnpm lint:boundaries
 */

import { execSync } from 'node:child_process';
import { readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Only scan directories where boundary rules are defined in eslint.config.js
import { readdirSync, statSync } from 'node:fs';

/** Check if a directory contains any lintable files (.ts, .js, .svelte) */
function hasLintableFiles(dir) {
	try {
		const entries = readdirSync(dir, { recursive: true });
		return entries.some(
			(e) =>
				(e.endsWith('.ts') || e.endsWith('.js') || e.endsWith('.svelte')) &&
				statSync(join(dir, String(e))).isFile()
		);
	} catch {
		return false;
	}
}

const allTargets = [
	'packages/*/src/',
	'apps/web/src/lib/shared/',
	'apps/web/src/lib/entities/',
	'apps/web/src/lib/features/',
	'apps/web/src/lib/widgets/',
	'apps/web/src/routes/api/emis/',
	'apps/web/src/routes/dashboard/emis/'
];

// Filter out directories with no lintable files to avoid ESLint errors
const targets = allTargets.filter((t) => {
	// Glob patterns (like packages/*/src/) are always kept
	if (t.includes('*')) return true;
	return hasLintableFiles(t);
}).join(' ');

// Write ESLint JSON to a temp file to avoid stdout buffer issues with execSync
const tmpFile = join(tmpdir(), `lint-boundaries-${process.pid}.json`);

try {
	execSync(`npx eslint ${targets} --no-warn-ignored -f json -o ${tmpFile}`, {
		encoding: 'utf8',
		maxBuffer: 20 * 1024 * 1024,
		stdio: ['pipe', 'pipe', 'pipe']
	});
} catch {
	// ESLint exits 1 when any errors exist (legacy noise); output file is still written
}

let raw;
try {
	raw = readFileSync(tmpFile, 'utf8');
} catch {
	console.error('No ESLint output file. Check that eslint is installed and targets exist.');
	process.exit(2);
} finally {
	try {
		unlinkSync(tmpFile);
	} catch {
		/* ignore cleanup errors */
	}
}

let results;
try {
	results = JSON.parse(raw);
} catch {
	console.error('Failed to parse ESLint JSON output.');
	process.exit(2);
}

const violations = [];

for (const file of results) {
	for (const msg of file.messages) {
		if (msg.ruleId === 'no-restricted-imports') {
			const rel = file.filePath.replace(process.cwd() + '/', '');
			violations.push({ file: rel, line: msg.line, message: msg.message });
		}
	}
}

if (violations.length) {
	console.log(`Boundary violations (${violations.length}):\n`);
	for (const v of violations) {
		console.log(`  ${v.file}:${v.line}`);
		console.log(`    ${v.message}\n`);
	}
	process.exit(1);
} else {
	console.log('No boundary violations found.');
}
