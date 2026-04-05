import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	authenticateUser,
	createSession,
	isSessionAuthReadyAsync,
	SESSION_COOKIE_NAME,
	SESSION_COOKIE_MAX_AGE,
	isSecureCookie
} from '$lib/server/emis/infra/auth';

/**
 * Validate redirect parameter to prevent open redirect attacks.
 * Only allows relative paths starting with '/' (not protocol-relative '//').
 * Falls back to '/emis' for invalid values.
 */
function sanitizeRedirect(raw: string | null): string {
	if (raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\')) {
		return raw;
	}
	return '/emis';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	// If already authenticated, redirect to emis home
	if (locals.emisSession) {
		const redirectTo = sanitizeRedirect(url.searchParams.get('redirect'));
		throw redirect(303, redirectTo);
	}

	return {
		authEnabled: await isSessionAuthReadyAsync()
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		if (!(await isSessionAuthReadyAsync())) {
			return fail(400, {
				error: 'Authentication is not configured. Set EMIS_AUTH_MODE=session and configure users.',
				username: ''
			});
		}

		const formData = await request.formData();
		const username = (formData.get('username') as string)?.trim() ?? '';
		const password = (formData.get('password') as string) ?? '';

		if (!username || !password) {
			return fail(400, {
				error: 'Username and password are required.',
				username
			});
		}

		const user = await authenticateUser(username, password);
		if (!user) {
			return fail(401, {
				error: 'Invalid username or password.',
				username
			});
		}

		const sessionId = await createSession(user);

		cookies.set(SESSION_COOKIE_NAME, sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: isSecureCookie(),
			maxAge: SESSION_COOKIE_MAX_AGE
		});

		const redirectTo = sanitizeRedirect(url.searchParams.get('redirect'));
		throw redirect(303, redirectTo);
	}
};
