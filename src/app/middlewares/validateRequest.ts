import type { RequestHandler } from "express";
import httpStatus from "http-status";
import type { ZodType } from "zod";
import { AppError } from "../utils/AppError";

export const validateRequest =
	(schema: ZodType): RequestHandler =>
	(req, _res, next) => {
		const result = schema.safeParse(req.body ?? {});

		if (!result.success) {
			next(
				new AppError(
					httpStatus.BAD_REQUEST,
					result.error.issues[0]?.message ?? "Validation failed.",
				),
			);
			return;
		}

		req.body = result.data;
		next();
	};
