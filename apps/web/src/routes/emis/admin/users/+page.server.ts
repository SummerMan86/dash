import type { PageServerLoad } from './$types';

import { listUsers } from '@dashboard-builder/emis-server/modules/users/repository';

export const load: PageServerLoad = async ({ locals }) => {
	const users = await listUsers();
	const currentUserId = locals.emisSession?.userId ?? null;
	return { users, currentUserId };
};
