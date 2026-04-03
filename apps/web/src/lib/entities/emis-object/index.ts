// MIGRATION: re-export from @dashboard-builder/emis-contracts
export type {
	EmisObjectStatus,
	EmisObjectSummary,
	EmisObjectRelatedNews,
	EmisObjectDetail,
	ListEmisObjectsInput,
	CreateEmisObjectInput,
	UpdateEmisObjectInput
} from '@dashboard-builder/emis-contracts/emis-object';
export {
	listEmisObjectsQuerySchema,
	createEmisObjectSchema,
	updateEmisObjectSchema,
	type ListEmisObjectsQueryInput,
	type CreateEmisObjectSchemaInput,
	type UpdateEmisObjectSchemaInput
} from '@dashboard-builder/emis-contracts/emis-object';
