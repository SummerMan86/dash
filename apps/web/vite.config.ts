import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import dotenv from 'dotenv';

// Load env from workspace root (two levels up from apps/web/)
dotenv.config({ path: '../../.env.map' });
dotenv.config({ path: '../../.env' });

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()]
});
