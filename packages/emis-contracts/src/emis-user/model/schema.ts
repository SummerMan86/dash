/**
 * EMIS User Zod schemas for request validation.
 *
 * Canonical contract: docs/emis_access_model.md section 5.
 */

import { z } from 'zod';

const emisRoleSchema = z.enum(['viewer', 'editor', 'admin']);

/** Schema for creating a new user (POST /api/emis/admin/users). */
export const createUserSchema = z.object({
	username: z
		.string()
		.trim()
		.min(1, 'username is required')
		.max(100, 'username must be at most 100 characters'),
	password: z
		.string()
		.min(8, 'password must be at least 8 characters')
		.max(255, 'password must be at most 255 characters'),
	role: emisRoleSchema
});

/** Schema for updating a user (PATCH /api/emis/admin/users/:id). */
export const updateUserSchema = z
	.object({
		username: z.string().trim().min(1).max(100).optional(),
		password: z.string().min(8).max(255).optional(),
		role: emisRoleSchema.optional()
	})
	.refine((v) => Object.keys(v).length > 0, {
		message: 'At least one field is required'
	});

/** Schema for changing own password (POST /api/emis/auth/change-password). */
export const changePasswordSchema = z.object({
	currentPassword: z
		.string()
		.min(1, 'currentPassword is required'),
	newPassword: z
		.string()
		.min(8, 'newPassword must be at least 8 characters')
		.max(255, 'newPassword must be at most 255 characters')
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
