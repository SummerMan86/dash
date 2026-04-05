import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Settings page requires authentication
	if (!locals.emisSession) {
		throw redirect(303, '/emis/login?redirect=/emis/settings');
	}

	return {
		username: locals.emisSession.username,
		role: locals.emisSession.role
	};
};
