import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	resolve: {
		alias: {
			$lib: path.resolve(__dirname, 'apps/web/src/lib')
		}
	},
	test: {
		include: [
			'packages/*/src/**/*.test.ts',
			'apps/web/src/routes/**/*.test.ts'
		],
		environment: 'node',
		passWithNoTests: true
	}
});
