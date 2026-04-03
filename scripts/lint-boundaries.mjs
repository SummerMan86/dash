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

// Only scan directories where boundary rules are defined in eslint.config.js
const targets = [
	'src/lib/shared/',
	'src/lib/entities/',
	'src/lib/features/',
	'src/lib/widgets/',
	'src/routes/api/emis/',
	'src/routes/dashboard/emis/'
].join(' ');

let raw;
try {
	raw = execSync(`npx eslint ${targets} --no-warn-ignored -f json`, {
		encoding: 'utf8',
		maxBuffer: 20 * 1024 * 1024, // 20 MB — ESLint JSON output can be large
		stdio: ['pipe', 'pipe', 'pipe']
	});
} catch (e) {
	// ESLint exits 1 when any errors exist (legacy noise); stdout still has JSON
	raw = e.stdout || '';
}

if (!raw) {
	console.error('No ESLint output. Check that eslint is installed and src/ exists.');
	process.exit(2);
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
