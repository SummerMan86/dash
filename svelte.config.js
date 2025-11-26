import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		
		// Path aliases 
		alias: {
			$lib: 'src/lib',
			$shared: 'src/lib/shared',
			$entities: 'src/lib/entities',
			$features: 'src/lib/features',  			
			$widgets: 'src/lib/widgets'
		}
	}
};

export default config;

