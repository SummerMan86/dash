import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import dotenv from 'dotenv';

// Load shared map config first, then local overrides
dotenv.config({ path: '.env.map' });
dotenv.config();

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()]
});
