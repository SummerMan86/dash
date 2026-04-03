// MIGRATION: re-export from @dashboard-builder/emis-contracts
export type {
	EmisNewsSummary,
	EmisNewsRelatedObject,
	EmisNewsDetail,
	ListEmisNewsInput,
	CreateEmisNewsInput,
	UpdateEmisNewsInput
} from '@dashboard-builder/emis-contracts/emis-news';
export {
	listEmisNewsQuerySchema,
	createEmisNewsSchema,
	updateEmisNewsSchema,
	type ListEmisNewsQueryInput,
	type CreateEmisNewsSchemaInput,
	type UpdateEmisNewsSchemaInput
} from '@dashboard-builder/emis-contracts/emis-news';
