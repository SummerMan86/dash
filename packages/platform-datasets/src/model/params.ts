/**
 * Standard reusable param schemas for read-model datasets.
 *
 * Datasets should compose these with dataset-specific params via z.object().merge()
 * or z.intersection(). genericCompile() understands these standard params automatically.
 *
 * Canonical reference: docs/architecture_dashboard_bi.md §2
 */
import { z } from 'zod';

/**
 * Standard pagination params: `limit` and `offset`.
 */
export const paginationParamsSchema = z.object({
	limit: z.coerce.number().int().positive().max(10_000).default(100),
	offset: z.coerce.number().int().min(0).default(0),
});

export type PaginationParams = z.infer<typeof paginationParamsSchema>;

/**
 * Create a typed sort params schema for a given set of sortable fields.
 *
 * @example
 * const sortSchema = createSortParamsSchema(['status', 'created_at']);
 * // sortBy: 'status' | 'created_at' | undefined
 * // sortDir: 'asc' | 'desc' (default 'asc')
 */
export const createSortParamsSchema = <TField extends string>(
	sortableFields: [TField, ...TField[]],
) =>
	z.object({
		sortBy: z.enum(sortableFields).optional(),
		sortDir: z.enum(['asc', 'desc']).default('asc'),
	});

export type SortParams<TField extends string = string> = {
	sortBy?: TField;
	sortDir: 'asc' | 'desc';
};
