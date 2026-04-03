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
const targets = [
	'src/lib/shared/',
	'src/lib/entities/',
	'src/lib/features/',
	'src/lib/widgets/',
	'src/routes/api/emis/',
	'src/routes/dashboard/emis/'
].join(' ');

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
	try { unlinkSync(tmpFile); } catch { /* ignore cleanup errors */ }
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
