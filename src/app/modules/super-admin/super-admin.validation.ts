import { z } from "zod";

const reasonSchema = z
	.string("Reason is required.")
	.trim()
	.min(5, "Reason must be at least 5 characters long.")
	.max(500, "Reason must be at most 500 characters long.");

export const superAdminValidation = {
	updateUserRole: z.object({
		role: z.enum(["USER", "ADMIN", "SUPER_ADMIN"]),
	}),

	reject: z.object({
		reason: reasonSchema,
	}),
};
