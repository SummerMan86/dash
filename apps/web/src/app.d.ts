// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { EmisSession } from '$lib/server/emis/infra/auth';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			emisSession?: EmisSession | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
