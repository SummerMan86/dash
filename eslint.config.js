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
	'$shared',
	'$shared/*',
	'$shared/**',
	'$entities',
	'$entities/*',
	'$entities/**',
	'$features',
	'$features/*',
	'$features/**',
	'$widgets',
	'$widgets/*',
	'$widgets/**',
	'**/apps/web/**'
];

export default defineConfig(
	includeIgnoreFile(gitignorePath),
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
			'no-undef': 'off'
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
	// Note: ESLint matches the literal import string — path aliases ($shared, $entities, etc.)
	// are NOT resolved before matching, so both alias forms must be listed where relevant.

	// FSD: shared — no upper-layer imports, no server imports
	{
		files: [
			'apps/web/src/lib/shared/**/*.ts',
			'apps/web/src/lib/shared/**/*.svelte.ts',
			'apps/web/src/lib/shared/**/*.svelte.js',
			'apps/web/src/lib/shared/**/*.svelte'
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['$entities/*', '$entities'],
							message: 'shared must not import from entities (FSD)'
						},
						{
							group: ['$features/*', '$features'],
							message: 'shared must not import from features (FSD)'
						},
						{
							group: ['$widgets/*', '$widgets'],
							message: 'shared must not import from widgets (FSD)'
						},
						{
							group: ['$lib/server/*', '$lib/server'],
							message: 'shared must not import from server modules'
						}
					]
				}
			]
		}
	},
	// FSD: entities — no features/widgets, no server
	{
		files: [
			'apps/web/src/lib/entities/**/*.ts',
			'apps/web/src/lib/entities/**/*.svelte.ts',
			'apps/web/src/lib/entities/**/*.svelte.js',
			'apps/web/src/lib/entities/**/*.svelte'
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['$features/*', '$features'],
							message: 'entities must not import from features (FSD)'
						},
						{
							group: ['$widgets/*', '$widgets'],
							message: 'entities must not import from widgets (FSD)'
						},
						{
							group: ['$lib/server/*', '$lib/server'],
							message: 'entities must not import from server modules'
						}
					]
				}
			]
		}
	},
	// FSD: features — no widgets, no server
	{
		files: [
			'apps/web/src/lib/features/**/*.ts',
			'apps/web/src/lib/features/**/*.svelte.ts',
			'apps/web/src/lib/features/**/*.svelte.js',
			'apps/web/src/lib/features/**/*.svelte'
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['$widgets/*', '$widgets'],
							message: 'features must not import from widgets (FSD)'
						},
						{
							group: ['$lib/server/*', '$lib/server'],
							message: 'features must not import from server modules'
						}
					]
				}
			]
		}
	},
	// FSD: widgets — no server
	{
		files: [
			'apps/web/src/lib/widgets/**/*.ts',
			'apps/web/src/lib/widgets/**/*.svelte.ts',
			'apps/web/src/lib/widgets/**/*.svelte.js',
			'apps/web/src/lib/widgets/**/*.svelte'
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['$lib/server/*', '$lib/server'],
							message: 'widgets must not import from server modules'
						}
					]
				}
			]
		}
	},
	// EMIS transport: routes/api/emis — no UI/client code (any, not just EMIS UI)
	{
		files: ['apps/web/src/routes/api/emis/**/*.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['$features/*', '$features'],
							message: 'API routes must not import features (transport-only)'
						},
						{
							group: ['$widgets/*', '$widgets'],
							message: 'API routes must not import widgets (transport-only)'
						},
						{ group: ['$shared/ui/*'], message: 'API routes must not import UI components' }
					]
				}
			]
		}
	},
	// Dashboard EMIS routes — no direct EMIS operational server imports
	{
		files: [
			'apps/web/src/routes/dashboard/emis/**/*.ts',
			'apps/web/src/routes/dashboard/emis/**/*.svelte.ts',
			'apps/web/src/routes/dashboard/emis/**/*.svelte.js',
			'apps/web/src/routes/dashboard/emis/**/*.svelte'
		],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['$lib/server/emis/*', '$lib/server/emis/**'],
							message: 'Dashboard EMIS routes must not import app-local EMIS server shims'
						},
						{
							group: [
								'@dashboard-builder/emis-server/modules/*',
								'@dashboard-builder/emis-server/modules/**'
							],
							message:
								'Dashboard EMIS routes must not import EMIS operational modules (use dataset path)'
						}
					]
				}
			]
		}
	}
);
