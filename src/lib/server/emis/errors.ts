export class EmisError extends Error {
	status: number;
	code: string;

	constructor(status: number, code: string, message: string) {
		super(message);
		this.name = 'EmisError';
		this.status = status;
		this.code = code;
	}
}

export function isEmisError(value: unknown): value is EmisError {
	return value instanceof EmisError;
}
