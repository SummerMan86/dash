import prettier from 'eslint-config-prettier';
import { fileURLToPath } from 'node:url';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelteConfig from './apps/web/svelte.config.js';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));
const packageSourceFiles = (pkg) => [
	`packages/${pkg}/src/**/*.ts`,
	`packages/${pkg}/src/**/*.svelte.ts`,
	`packages/${pkg}/src/**/*.svelte.js`,
	`packages/${pkg}/src/**/*.svelte`
];
const appImportPatterns = [
	'$lib',
	'$lib/*',
	'$lib/**',
	'**/apps/web/**'
];
const appLocalModuleImportPatterns = (moduleName) => [
	`$lib/${moduleName}`,
	`$lib/${moduleName}/*`,
	`$lib/${moduleName}/**`,
	`**/${moduleName}`,
	`**/${moduleName}/*`,
	`**/${moduleName}/**`
];
const dashboardEditImportPatterns = appLocalModuleImportPatterns('dashboard-edit');
const emisManualEntryImportPatterns = appLocalModuleImportPatterns('emis-manual-entry');
const serverImportPatterns = [
	'$lib/server',
	'$lib/server/*',
	'$lib/server/**',
	'**/server',
	'**/server/*',
	'**/server/**',
	'@dashboard-builder/db',
	'@dashboard-builder/db/*',
	'@dashboard-builder/db/**',
	'@dashboard-builder/*/server',
	'@dashboard-builder/*/server/*',
	'@dashboard-builder/*/server/**',
	'@dashboard-builder/emis-server',
	'@dashboard-builder/emis-server/*',
	'@dashboard-builder/emis-server/**'
];
const clientUiImportPatterns = [
	...dashboardEditImportPatterns,
	...emisManualEntryImportPatterns,
	'@dashboard-builder/platform-ui',
	'@dashboard-builder/platform-ui/*',
	'@dashboard-builder/platform-ui/**',
	'@dashboard-builder/emis-ui',
	'@dashboard-builder/emis-ui/*',
	'@dashboard-builder/emis-ui/**',
	'svelte',
	'svelte/*',
	'**/*.svelte'
];

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	{
		ignores: ['archive/**']
	},
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
			rules: {
				// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
				// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
				'no-undef': 'off',
				'@typescript-eslint/no-unused-vars': [
					'error',
					{
						argsIgnorePattern: '^_',
						varsIgnorePattern: '^_',
						caughtErrorsIgnorePattern: '^_'
					}
				],

				// ── Svelte 5 migration rules: warn-only ─────────────────────────
				// These are recommended Svelte 5 best practices but the codebase
				// has a large pre-existing baseline. Kept as warnings so they
				// surface in touched files without blocking CI on untouched code.
				'svelte/no-navigation-without-resolve': 'warn',
				'svelte/require-each-key': 'warn',
				'svelte/prefer-svelte-reactivity': 'warn'
			}
		},
		{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		}
	},

	// Package-era boundaries: package source must not reach into apps/web.
	// Each package only imports the workspace edges it currently owns.
	{
		files: packageSourceFiles('platform-core'),
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['@dashboard-builder/*', ...appImportPatterns],
							message: 'platform-core must not import workspace packages or apps/web'
						}
					]
				}
			]
		}
	},
	{
		files: packageSourceFiles('db'),
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['@dashboard-builder/*', ...appImportPatterns],
							message: 'db must not import workspace packages or apps/web'
						}
					]
				}
			]
		}
	},
	{
		files: packageSourceFiles('platform-ui'),
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: [
								'@dashboard-builder/db',
								'@dashboard-builder/platform-datasets',
								'@dashboard-builder/platform-filters',
								'@dashboard-builder/emis-*',
								...appImportPatterns
							],
							message: 'platform-ui may only import platform-core from the workspace'
						}
					]
				}
			]
		}
	},
	{
		files: packageSourceFiles('platform-datasets'),
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: [
								'@dashboard-builder/platform-ui',
								'@dashboard-builder/platform-filters',
								'@dashboard-builder/emis-*',
								...appImportPatterns
							],
							message: 'platform-datasets may only import platform-core and db from the workspace'
						}
					]
				}
			]
		}
	},
	{
		files: packageSourceFiles('platform-filters'),
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['@dashboard-builder/db', '@dashboard-builder/emis-*', ...appImportPatterns],
							message:
								'platform-filters may only import platform-core, platform-ui, and platform-datasets from the workspace'
						}
					]
				}
			]
		}
	},
	{
		files: packageSourceFiles('emis-contracts'),
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: [
								'@dashboard-builder/db',
								'@dashboard-builder/platform-ui',
								'@dashboard-builder/platform-datasets',
								'@dashboard-builder/platform-filters',
								'@dashboard-builder/emis-server',
								'@dashboard-builder/emis-ui',
								...appImportPatterns
							],
							message: 'emis-contracts may only import platform-core from the workspace'
						}
					]
				}
			]
		}
	},
	{
		files: packageSourceFiles('emis-server'),
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: [
								'@dashboard-builder/platform-ui',
								'@dashboard-builder/platform-filters',
								'@dashboard-builder/emis-ui',
								...appImportPatterns
							],
							message: 'emis-server must not import UI packages or apps/web'
						}
					]
				}
			]
		}
	},
	{
		files: packageSourceFiles('emis-ui'),
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: [
								'@dashboard-builder/db',
								'@dashboard-builder/platform-datasets',
								'@dashboard-builder/emis-server',
								...appImportPatterns
							],
							message: 'emis-ui must not import db, platform-datasets, emis-server, or apps/web'
						}
					]
				}
			]
		}
	},

	// ── Architecture boundary guardrails (ST-4) ──────────────────────────
	// Each file scope has ONE no-restricted-imports block with all its combined patterns.
	// (ESLint flat config: later matching block overrides, not merges, same rule key.)
	// Note: ESLint matches the literal import string. Aliases and relative sibling paths
	// are NOT resolved before matching, so both forms must be listed where relevant.

	// App-local peer modules stay isolated and must not reach into server-only code.
	{
		files: [
			'apps/web/src/lib/dashboard-edit/**/*.ts',
			'apps/web/src/lib/dashboard-edit/**/*.svelte.ts',
			'apps/web/src/lib/dashboard-edit/**/*.svelte.js',
			'apps/web/src/lib/dashboard-edit/**/*.svelte'
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: emisManualEntryImportPatterns,
							message: 'dashboard-edit must not import from emis-manual-entry (app-local peer boundary)'
						},
						{
							group: serverImportPatterns,
							message: 'dashboard-edit must not import server-only modules'
						}
					]
				}
			]
		}
	},
	{
		files: [
			'apps/web/src/lib/emis-manual-entry/**/*.ts',
			'apps/web/src/lib/emis-manual-entry/**/*.svelte.ts',
			'apps/web/src/lib/emis-manual-entry/**/*.svelte.js',
			'apps/web/src/lib/emis-manual-entry/**/*.svelte'
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: dashboardEditImportPatterns,
							message: 'emis-manual-entry must not import from dashboard-edit (app-local peer boundary)'
						},
						{
							group: serverImportPatterns,
							message: 'emis-manual-entry must not import server-only modules'
						}
					]
				}
			]
		}
	},
	// App-local server layer — no client/UI imports.
	{
		files: [
			'apps/web/src/lib/server/**/*.ts',
			'apps/web/src/lib/server/**/*.svelte.ts',
			'apps/web/src/lib/server/**/*.svelte.js'
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: clientUiImportPatterns,
							message: 'src/lib/server must not import client/UI modules'
						}
					]
				}
			]
		}
	},
	// Dashboard client modules (non-EMIS) must stay route/UI-side and use HTTP/BFF seams.
	{
		files: [
			'apps/web/src/routes/dashboard/**/*.ts',
			'apps/web/src/routes/dashboard/**/*.svelte.ts',
			'apps/web/src/routes/dashboard/**/*.svelte.js',
			'apps/web/src/routes/dashboard/**/*.svelte'
		],
		ignores: [
			'apps/web/src/routes/dashboard/emis/**',
			'apps/web/src/routes/dashboard/**/+page.server.ts',
			'apps/web/src/routes/dashboard/**/+layout.server.ts',
			'apps/web/src/routes/dashboard/**/+server.ts'
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: serverImportPatterns,
							message:
								'dashboard client modules must not import server-only modules directly; use route/BFF seams'
						}
					]
				}
			]
		}
	},
	// Dashboard EMIS client modules — BI pages stay on the dataset/BFF seam.
	{
		files: [
			'apps/web/src/routes/dashboard/emis/**/*.ts',
			'apps/web/src/routes/dashboard/emis/**/*.svelte.ts',
			'apps/web/src/routes/dashboard/emis/**/*.svelte.js',
			'apps/web/src/routes/dashboard/emis/**/*.svelte'
		],
		ignores: [
			'apps/web/src/routes/dashboard/emis/**/+page.server.ts',
			'apps/web/src/routes/dashboard/emis/**/+layout.server.ts',
			'apps/web/src/routes/dashboard/emis/**/+server.ts'
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: serverImportPatterns,
							message:
								'dashboard EMIS client modules must not import server-only modules directly; use dataset/BFF seams'
						}
					]
				}
			]
		}
	},
	// EMIS operational client modules — no direct server imports.
	{
		files: [
			'apps/web/src/routes/emis/**/*.ts',
			'apps/web/src/routes/emis/**/*.svelte.ts',
			'apps/web/src/routes/emis/**/*.svelte.js',
			'apps/web/src/routes/emis/**/*.svelte'
		],
		ignores: [
			'apps/web/src/routes/emis/**/+page.server.ts',
			'apps/web/src/routes/emis/**/+layout.server.ts',
			'apps/web/src/routes/emis/**/+server.ts'
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: serverImportPatterns,
							message:
								'EMIS client modules must not import server-only modules directly; use load functions or API routes'
						}
					]
				}
			]
		}
	},
	// API transport routes — no client/UI imports.
	{
		files: ['apps/web/src/routes/api/**/*.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: clientUiImportPatterns,
							message: 'API routes must stay transport-only and must not import client/UI modules'
						}
					]
				}
			]
		}
	}
);
