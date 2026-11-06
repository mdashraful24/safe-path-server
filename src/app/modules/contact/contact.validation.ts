import httpStatus from "http-status";
import { z } from "zod";
import { AppError } from "../../utils/AppError";

const nameSchema = z
	.string("Name must be a string.")
	.trim()
	.min(2, "Name must be at least 2 characters long.")
	.max(100, "Name must be at most 100 characters long.");

const emailSchema = z
	.string("Email must be a string.")
	.trim()
	.min(1, "Email is required.")
	.max(254, "Email must be at most 254 characters long.")
	.toLowerCase()
	.email("Please provide a valid email address.");

const subjectSchema = z
	.string("Subject must be a string.")
	.trim()
	.min(3, "Subject must be at least 3 characters long.")
	.max(150, "Subject must be at most 150 characters long.");

const messageSchema = z
	.string("Message must be a string.")
	.trim()
	.min(20, "Message must be at least 20 characters long.")
	.max(5000, "Message must be at most 5000 characters long.");

const replyMessageSchema = z
	.string("Reply must be a string.")
	.trim()
	.min(2, "Reply must be at least 2 characters long.")
	.max(5000, "Reply must be at most 5000 characters long.");

const topicSchema = z.enum(
	["GENERAL", "REPORT_ISSUE", "ACCOUNT", "SAFETY", "PARTNERSHIP", "OTHER"],
	"Please choose a valid topic.",
);

const createSchema = z
	.object({
		name: nameSchema,
		email: emailSchema,
		topic: topicSchema,
		subject: subjectSchema,
		message: messageSchema,
	})
	.strict();

const optionalQueryPositiveInt = (max = Number.MAX_SAFE_INTEGER) =>
	z.preprocess(
		(value) => (value === "" || value === null ? undefined : value),
		z.coerce.number().int().positive().max(max).optional(),
	);

const optionalQueryText = (max: number) =>
	z.preprocess(
		(value) => (value === "" || value === null ? undefined : value),
		z.string().trim().min(1).max(max).optional(),
	);

const listQuerySchema = z
	.object({
		page: optionalQueryPositiveInt(),
		limit: optionalQueryPositiveInt(100),
		searchTerm: optionalQueryText(100),
		status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED"]).optional(),
		topic: topicSchema.optional(),
		sortOrder: z.enum(["asc", "desc"]).optional(),
	})
	.strict();

const replySchema = z
	.object({
		message: replyMessageSchema,
	})
	.strict();

export const contactValidation = {
	create: createSchema,
	reply: replySchema,
	listQuery: listQuerySchema,
};

export const parseContactListQuery = (query: unknown) => {
	const result = listQuerySchema.safeParse(query);

	if (!result.success) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			result.error.issues[0]?.message ?? "Invalid query parameters.",
		);
	}

	return result.data;
};
