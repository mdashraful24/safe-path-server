export class AppError extends Error {
	public readonly statusCode: number;
	public readonly isOperational: boolean;
	public readonly details?: unknown;

	constructor(
		statusCode: number,
		message: string,
		options: { details?: unknown; cause?: unknown } = {},
	) {
		super(message, { cause: options.cause });
		this.name = "AppError";
		this.statusCode = statusCode;
		this.isOperational = true;
		this.details = options.details;
		Error.captureStackTrace(this, this.constructor);
	}

	static badRequest(message: string, details?: unknown) {
		return new AppError(400, message, { details });
	}

	static unauthorized(message = "Authentication is required.") {
		return new AppError(401, message);
	}

	static forbidden(message = "You do not have permission to do that.") {
		return new AppError(403, message);
	}

	static notFound(message = "Resource not found.") {
		return new AppError(404, message);
	}

	static conflict(message: string) {
		return new AppError(409, message);
	}
}
