import { z } from "zod";

const nameSchema = z
	.string("Name must be a string.")
	.trim()
	.min(2, "Name must be at least 2 characters long.")
	.max(100, "Name must be at most 100 characters long.");

export const userValidation = {
	updateProfile: z.object({
		name: nameSchema.optional(),
	}),

	requestAccountDeletion: z.object({
		reason: z
			.string("Reason must be a string.")
			.trim()
			.max(500, "Reason must be at most 500 characters long.")
			.optional(),
	}),
};
