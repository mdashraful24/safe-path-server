import type { ErrorRequestHandler, RequestHandler } from "express";
import httpStatus from "http-status";
import multer from "multer";
import { Prisma } from "../../../generated/prisma/client";
import config from "../config";
import { AppError } from "../utils/AppError";

export const globalErrorHandler: ErrorRequestHandler = (
	err,
	req,
	res,
	_next,
) => {
	let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
	let message = "Something went wrong. Please try again.";

	if (err instanceof AppError) {
		statusCode = err.statusCode;
		message = err.message;
	} else if (err instanceof multer.MulterError) {
		statusCode = err.code === "LIMIT_FILE_SIZE" ? 413 : httpStatus.BAD_REQUEST;
		message =
			err.code === "LIMIT_FILE_SIZE"
				? "Image size must be 5 MB or less."
				: err.message;
	} else if (err instanceof Prisma.PrismaClientKnownRequestError) {
		if (err.code === "P2002") {
			statusCode = httpStatus.CONFLICT;
			message = "A record with these details already exists.";
		} else if (err.code === "P2025") {
			statusCode = httpStatus.NOT_FOUND;
			message = "The requested record was not found.";
		}
	} else if (err instanceof Prisma.PrismaClientValidationError) {
		statusCode = httpStatus.BAD_REQUEST;
		message = "Invalid data was provided.";
	} else if (err instanceof SyntaxError) {
		statusCode = httpStatus.BAD_REQUEST;
		message = "The request body is not valid JSON.";
	} else if (config.node_env === "development" && err instanceof Error) {
		message = err.message;
	}

	if (statusCode >= httpStatus.INTERNAL_SERVER_ERROR) {
		console.error(`[${req.method} ${req.originalUrl}]`, err);
	}

	res.status(statusCode).json({
		success: false,
		statusCode,
		message:
			statusCode >= httpStatus.INTERNAL_SERVER_ERROR &&
			config.node_env === "production"
				? "Something went wrong. Please try again."
				: message,
	});
};

export const notFound: RequestHandler = (req, res) => {
	res.status(httpStatus.NOT_FOUND).json({
		success: false,
		statusCode: httpStatus.NOT_FOUND,
		message: `Route ${req.method} ${req.originalUrl} was not found.`,
	});
};
