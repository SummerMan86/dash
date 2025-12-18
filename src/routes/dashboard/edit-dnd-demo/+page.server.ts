import type { PageServerLoad } from './$types';
import { createDemoDashboard } from './demo-fixture';

export const load: PageServerLoad = async () => {
	return {
		dashboard: createDemoDashboard()
	};
};
