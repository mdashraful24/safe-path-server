import httpStatus from "http-status";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import {
	adminUserSortFields,
	deletionRequestSortFields,
} from "./admin.interface";

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

const reasonSchema = z
	.string("Reason is required.")
	.trim()
	.min(5, "Reason must be at least 5 characters long.")
	.max(500, "Reason must be at most 500 characters long.");

const emailSchema = z
	.string("Email is required.")
	.trim()
	.min(1, "Email is required.")
	.max(254, "Email must be at most 254 characters long.")
	.toLowerCase()
	.email("Please provide a valid email address.");

const passwordSchema = z
	.string("Password is required.")
	.min(8, "Password must be at least 8 characters long.")
	.max(72, "Password must be at most 72 characters long.")
	.regex(/[a-z]/, "Password must contain at least one lowercase letter.")
	.regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
	.regex(/[0-9]/, "Password must contain at least one number.")
	.regex(
		/[^A-Za-z0-9]/,
		"Password must contain at least one special character.",
	);

const listUsersQuerySchema = z
	.object({
		page: optionalQueryPositiveInt(),
		limit: optionalQueryPositiveInt(100),
		searchTerm: optionalQueryText(100),
		role: z.enum(["USER", "ADMIN", "SUPER_ADMIN"]).optional(),
		status: z
			.enum(["ACTIVE", "BLOCKED", "PENDING_DELETION", "DELETED", "PURGED"])
			.optional(),
		sortBy: z.enum(adminUserSortFields).optional(),
		sortOrder: z.enum(["asc", "desc"]).optional(),
	})
	.strict();

const listDeletionRequestsQuerySchema = z
	.object({
		page: optionalQueryPositiveInt(),
		limit: optionalQueryPositiveInt(100),
		searchTerm: optionalQueryText(100),
		role: z.enum(["USER", "ADMIN", "SUPER_ADMIN"]).optional(),
		sortBy: z.enum(deletionRequestSortFields).optional(),
		sortOrder: z.enum(["asc", "desc"]).optional(),
	})
	.strict();

export const adminValidation = {
	updateUserStatus: z.object({
		status: z.enum(["ACTIVE", "BLOCKED"]),
	}),

	rejectDeletion: z.object({
		reason: reasonSchema,
	}),

	restoreAccount: z.object({
		reason: reasonSchema,
	}),

	createChangeRequest: z.discriminatedUnion("type", [
		z
			.object({
				type: z.literal("EMAIL"),
				reason: reasonSchema,
				requestedEmail: emailSchema,
			})
			.strict(),
		z
			.object({
				type: z.literal("PASSWORD"),
				reason: reasonSchema,
				newPassword: passwordSchema,
			})
			.strict(),
	]),
};

export const parseAdminUserListQuery = (query: unknown) => {
	const result = listUsersQuerySchema.safeParse(query);

	if (!result.success) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			result.error.issues[0]?.message ?? "Invalid query parameters.",
		);
	}

	return result.data;
};

export const parseDeletionRequestListQuery = (query: unknown) => {
	const result = listDeletionRequestsQuerySchema.safeParse(query);

	if (!result.success) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			result.error.issues[0]?.message ?? "Invalid query parameters.",
		);
	}

	return result.data;
};
