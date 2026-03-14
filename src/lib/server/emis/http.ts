import { json, type RequestHandler } from '@sveltejs/kit';
import { z } from 'zod';

import { EmisError, isEmisError } from './errors';

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(
	request: Request,
	schema: TSchema
): Promise<z.infer<TSchema>> {
	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		throw new EmisError(400, 'INVALID_JSON', 'Invalid JSON body');
	}

	const parsed = schema.safeParse(payload);
	if (!parsed.success) {
		throw new EmisError(
			400,
			'VALIDATION_ERROR',
			parsed.error.issues[0]?.message ?? 'Validation failed'
		);
	}

	return parsed.data;
}

export function requireUuid(value: string | undefined, fieldName: string): string {
	if (
		!value ||
		!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
	) {
		throw new EmisError(400, 'INVALID_ID', `Invalid ${fieldName}`);
	}
	return value;
}

export function parseIntParam(
	value: string | null,
	fallback: number,
	options: { min: number; max: number }
): number {
	if (!value) return fallback;
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return fallback;
	return Math.max(options.min, Math.min(options.max, Math.trunc(parsed)));
}

export function handleEmisRoute(
	handler: RequestHandler,
	fallbackMessage = 'Unexpected EMIS server error'
): RequestHandler {
	return async (event) => {
		try {
			return await handler(event);
		} catch (error) {
			if (isEmisError(error)) {
				return json({ error: error.message, code: error.code }, { status: error.status });
			}

			const message = error instanceof Error ? error.message : '';
			if (message.includes('DATABASE_URL')) {
				return json({ error: 'DATABASE_URL is not set' }, { status: 500 });
			}
			if (message.includes('relation "emis.') || message.includes('schema "emis"')) {
				return json(
					{ error: 'EMIS schema is not initialized yet. Run db:migrate and db:seed first.' },
					{ status: 503 }
				);
			}

			return json({ error: fallbackMessage }, { status: 500 });
		}
	};
}
