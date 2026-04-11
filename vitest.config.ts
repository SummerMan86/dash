import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	resolve: {
		alias: {
			$lib: path.resolve(__dirname, 'apps/web/src/lib'),
			$shared: path.resolve(__dirname, 'apps/web/src/lib/shared'),
			$entities: path.resolve(__dirname, 'apps/web/src/lib/entities'),
			$features: path.resolve(__dirname, 'apps/web/src/lib/features'),
			$widgets: path.resolve(__dirname, 'apps/web/src/lib/widgets')
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
