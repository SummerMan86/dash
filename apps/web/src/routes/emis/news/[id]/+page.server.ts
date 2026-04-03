import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

import { getNewsDetailQuery } from '$lib/server/emis/modules/news/queries';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const load: PageServerLoad = async ({ params }) => {
	const id = params.id;
	if (!id || !UUID_RE.test(id)) {
		throw error(404, 'News item not found');
	}

	const news = await getNewsDetailQuery(id);
	if (!news) {
		throw error(404, 'News item not found');
	}

	return {
		news
	};
};
