import type { ErrorRequestHandler, RequestHandler } from "express";
import httpStatus from "http-status";
import multer from "multer";
import { ZodError } from "zod";
import { Prisma } from "../../../generated/prisma/client";
import config from "../config";
import { AppError } from "../utils/AppError";

type ErrorBody = {
	success: false;
	statusCode: number;
	message: string;
	errors?: unknown;
};

const prismaMessage = (
	error: Prisma.PrismaClientKnownRequestError,
): { statusCode: number; message: string } => {
	switch (error.code) {
		case "P2000":
			return {
				statusCode: httpStatus.BAD_REQUEST,
				message: "A provided value is too long for its field.",
			};
		case "P2002":
			return {
				statusCode: httpStatus.CONFLICT,
				message: "A record with these details already exists.",
			};
		case "P2003":
			return {
				statusCode: httpStatus.BAD_REQUEST,
				message: "A related record does not exist.",
			};
		case "P2024":
			return {
				statusCode: httpStatus.REQUEST_TIMEOUT,
				message: "The database took too long to respond. Please try again.",
			};
		case "P2025":
			return {
				statusCode: httpStatus.NOT_FOUND,
				message: "The requested record was not found.",
			};
		default:
			return {
				statusCode: httpStatus.INTERNAL_SERVER_ERROR,
				message: "A database error occurred.",
			};
	}
};

export const globalErrorHandler: ErrorRequestHandler = (
	err,
	req,
	res,
	_next,
) => {
	let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
	let message = "Something went wrong. Please try again.";
	let errors: unknown;

	if (err instanceof AppError) {
		statusCode = err.statusCode;
		message = err.message;
		errors = err.details;
	} else if (err instanceof ZodError) {
		statusCode = httpStatus.BAD_REQUEST;
		message = err.issues[0]?.message ?? "Validation failed.";
		errors = err.issues.map((issue) => ({
			field: issue.path.join(".") || "(root)",
			message: issue.message,
		}));
	} else if (err instanceof Prisma.PrismaClientKnownRequestError) {
		const mapped = prismaMessage(err);
		statusCode = mapped.statusCode;
		message = mapped.message;
	} else if (err instanceof Prisma.PrismaClientValidationError) {
		statusCode = httpStatus.BAD_REQUEST;
		message = "Invalid data was provided.";
	} else if (err instanceof Prisma.PrismaClientInitializationError) {
		statusCode = httpStatus.SERVICE_UNAVAILABLE;
		message = "The database is currently unavailable.";
	} else if (err instanceof multer.MulterError) {
		statusCode = httpStatus.BAD_REQUEST;

		if (err.code === "LIMIT_FILE_SIZE") {
			message = "Image must be 5 MB or smaller.";
		} else if (err.code === "LIMIT_UNEXPECTED_FILE") {
			message = "Unexpected file field. Send one image in the 'image' field.";
		} else {
			message = "The image could not be uploaded.";
		}

		errors = [{ field: err.field ?? "image", message }];
	} else if (
		err instanceof SyntaxError &&
		"body" in err &&
		typeof (err as { body?: unknown }).body !== "undefined"
	) {
		statusCode = httpStatus.BAD_REQUEST;
		message = "The request body is not valid JSON.";
	} else if (err instanceof Error && config.node_env === "development") {
		message = err.message;
	}

	const isUnexpected = statusCode >= 500;
	if (isUnexpected) {
		console.error(
			`[${req.method} ${req.originalUrl}]`,
			err instanceof Error ? (err.stack ?? err.message) : err,
		);
	}

	const body: ErrorBody = {
		success: false,
		statusCode,
		message:
			isUnexpected && config.is_production
				? "Something went wrong. Please try again."
				: message,
	};

	if (errors) body.errors = errors;

	res.status(statusCode).json(body);
};

export const notFound: RequestHandler = (req, res) => {
	res.status(httpStatus.NOT_FOUND).json({
		success: false,
		statusCode: httpStatus.NOT_FOUND,
		message: `Route ${req.method} ${req.originalUrl} was not found.`,
	});
};
