import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import dotenv from 'dotenv';

// Load .env file for server-side environment variables
dotenv.config();

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()]
});
