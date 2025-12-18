import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	// This endpoint exists mainly to demonstrate debounced + abortable saving.
	// The actual persistence for the demo happens in localStorage.
	const payload = await request.json().catch(() => null);

	return json({ ok: true, received: !!payload, savedAt: new Date().toISOString() });
};
