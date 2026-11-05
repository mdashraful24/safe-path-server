import httpStatus from "http-status";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import { incidentSortFields } from "./incident.interface";

const categorySchema = z.enum([
	"HARASSMENT",
	"THEFT",
	"SUSPICIOUS_ACTIVITY",
	"UNSAFE_AREA",
	"OTHER",
]);

const statusSchema = z.enum(["PENDING", "APPROVED", "REJECTED"]);

const optionalText = (max: number) =>
	z.preprocess(
		(value) => (value === "" || value === null ? undefined : value),
		z.string().trim().min(1).max(max).optional(),
	);

const optionalCoordinate = (min: number, max: number) =>
	z.preprocess(
		(value) => (value === "" || value === null ? undefined : value),
		z.coerce.number().min(min).max(max).optional(),
	);

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

const createSchema = z
	.object({
		title: z
			.string("Title must be a string.")
			.trim()
			.min(3, "Title must be at least 3 characters long.")
			.max(120, "Title must be at most 120 characters long."),
		description: z
			.string("Description must be a string.")
			.trim()
			.min(10, "Description must be at least 10 characters long.")
			.max(2000, "Description must be at most 2000 characters long."),
		category: categorySchema,
		area: z
			.string("Area must be a string.")
			.trim()
			.min(2, "Area must be at least 2 characters long.")
			.max(100, "Area must be at most 100 characters long."),
		location: optionalText(200),
		latitude: optionalCoordinate(-90, 90),
		longitude: optionalCoordinate(-180, 180),
		incidentDate: z.coerce
			.date()
			.refine(
				(value) => value.getTime() <= Date.now() + 5 * 60 * 1000,
				"Incident date cannot be in the future.",
			),
	})
	.strict()
	.superRefine((data, ctx) => {
		const hasLatitude = data.latitude !== undefined;
		const hasLongitude = data.longitude !== undefined;

		if (hasLatitude !== hasLongitude) {
			ctx.addIssue({
				code: "custom",
				path: [hasLatitude ? "longitude" : "latitude"],
				message: "Latitude and longitude must be provided together.",
			});
		}
	});

const reviewSchema = z
	.object({
		status: z.enum(["APPROVED", "REJECTED"]),
		note: optionalText(500),
	})
	.strict()
	.superRefine((data, ctx) => {
		if (data.status === "REJECTED" && !data.note) {
			ctx.addIssue({
				code: "custom",
				path: ["note"],
				message: "A review note is required when rejecting an incident.",
			});
		}
	});

const listQuerySchema = z
	.object({
		page: optionalPositiveInt(),
		limit: optionalPositiveInt(100),
		area: optionalText(100),
		category: categorySchema.optional(),
		status: statusSchema.optional(),
		search: optionalText(100),
		searchTerm: optionalText(100),
		sortBy: z.enum(incidentSortFields).optional(),
		sortOrder: z.enum(["asc", "desc"]).optional(),
	})
	.strict();

export const incidentValidation = {
	create: createSchema,
	review: reviewSchema,
	listQuery: listQuerySchema,
};

export const parseIncidentListQuery = (query: unknown) => {
	const result = listQuerySchema.safeParse(query);

	if (!result.success) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			result.error.issues[0]?.message ?? "Invalid query parameters.",
		);
	}

	return result.data;
};
