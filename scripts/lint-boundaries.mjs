/**
 * Boundary-only lint verification.
 *
 * Runs ESLint on src/ and reports ONLY no-restricted-imports violations,
 * filtering out all other lint noise (legacy formatting, unused vars, etc.).
 *
 * Usage: node scripts/lint-boundaries.mjs
 *        pnpm lint:boundaries
 */

import { execSync } from 'node:child_process';

let raw;
try {
	raw = execSync('npx eslint src/ --no-warn-ignored -f json', {
		encoding: 'utf8',
		stdio: ['pipe', 'pipe', 'pipe']
	});
} catch (e) {
	// ESLint exits 1 when any errors exist (legacy noise); stdout still has JSON
	raw = e.stdout || '';
}

if (!raw) {
	console.error('No ESLint output.');
	process.exit(2);
}

const results = JSON.parse(raw);
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
