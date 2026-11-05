import httpStatus from "http-status";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import {
	adminListSortFields,
	changeRequestSortFields,
} from "./super-admin.interface";

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

const listAdminsQuerySchema = z
	.object({
		page: optionalQueryPositiveInt(),
		limit: optionalQueryPositiveInt(100),
		searchTerm: optionalQueryText(100),
		role: z.enum(["ADMIN", "SUPER_ADMIN"]).optional(),
		status: z.enum(["ACTIVE", "BLOCKED", "PENDING_DELETION"]).optional(),
		sortBy: z.enum(adminListSortFields).optional(),
		sortOrder: z.enum(["asc", "desc"]).optional(),
	})
	.strict();

const listChangeRequestsQuerySchema = z
	.object({
		page: optionalQueryPositiveInt(),
		limit: optionalQueryPositiveInt(100),
		searchTerm: optionalQueryText(100),
		type: z.enum(["EMAIL", "PASSWORD"]).optional(),
		status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
		sortBy: z.enum(changeRequestSortFields).optional(),
		sortOrder: z.enum(["asc", "desc"]).optional(),
	})
	.strict();

export const superAdminValidation = {
	updateUserRole: z.object({
		role: z.enum(["USER", "ADMIN", "SUPER_ADMIN"]),
	}),

	reject: z.object({
		reason: reasonSchema,
	}),
};

export const parseAdminListQuery = (query: unknown) => {
	const result = listAdminsQuerySchema.safeParse(query);

	if (!result.success) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			result.error.issues[0]?.message ?? "Invalid query parameters.",
		);
	}

	return result.data;
};

export const parseChangeRequestListQuery = (query: unknown) => {
	const result = listChangeRequestsQuerySchema.safeParse(query);

	if (!result.success) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			result.error.issues[0]?.message ?? "Invalid query parameters.",
		);
	}

	return result.data;
};
