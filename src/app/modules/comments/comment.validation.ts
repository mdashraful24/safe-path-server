import httpStatus from "http-status";
import { z } from "zod";
import { AppError } from "../../utils/AppError";

const optionalPositiveInt = (max?: number) =>
	z.preprocess(
		(value) => (value === "" || value === null ? undefined : value),
		z.coerce
			.number()
			.int()
			.positive()
			.max(max ?? Number.MAX_SAFE_INTEGER)
			.optional(),
	);

const contentSchema = z
	.string("Comment must be a string.")
	.trim()
	.min(1, "Comment cannot be empty.")
	.max(1000, "Comment must be at most 1000 characters long.");

const createSchema = z
	.object({
		content: contentSchema,
	})
	.strict();

const listQuerySchema = z
	.object({
		page: optionalPositiveInt(),
		limit: optionalPositiveInt(100),
		sortOrder: z.enum(["asc", "desc"]).optional(),
	})
	.strict();

export const commentValidation = {
	create: createSchema,
	update: createSchema,
	listQuery: listQuerySchema,
};

export const parseCommentListQuery = (query: unknown) => {
	const result = listQuerySchema.safeParse(query);

	if (!result.success) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			result.error.issues[0]?.message ?? "Invalid query parameters.",
		);
	}

	return result.data;
};
