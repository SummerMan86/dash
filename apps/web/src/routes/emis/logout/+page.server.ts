import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteSession, SESSION_COOKIE_NAME } from '$lib/server/emis/infra/auth';

export const load: PageServerLoad = async () => {
	// GET /emis/logout — redirect to login (logout is POST-only)
	throw redirect(303, '/emis/login');
};

export const actions: Actions = {
	default: async ({ cookies }) => {
		const sessionId = cookies.get(SESSION_COOKIE_NAME);
		if (sessionId) {
			deleteSession(sessionId);
		}

		cookies.delete(SESSION_COOKIE_NAME, { path: '/' });

		throw redirect(303, '/emis/login');
	}
};
