import { z } from "zod";

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

const passwordSchema = z
	.string("Password must be a string.")
	.min(8, "Password must be at least 8 characters long.")
	.max(72, "Password must be at most 72 characters long.")
	.regex(/[a-z]/, "Password must contain at least one lowercase letter.")
	.regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
	.regex(/[0-9]/, "Password must contain at least one number.")
	.regex(
		/[^A-Za-z0-9]/,
		"Password must contain at least one special character.",
	);

export const userValidation = {
	updateProfile: z
		.object({
			name: nameSchema.optional(),
			email: emailSchema.optional(),
			currentPassword: z
				.string("Current password must be a string.")
				.min(1, "Current password is required.")
				.optional(),
			newPassword: passwordSchema.optional(),
		})
		.superRefine((data, ctx) => {
			const updatesCredentials = Boolean(data.email || data.newPassword);

			if (updatesCredentials && !data.currentPassword) {
				ctx.addIssue({
					code: "custom",
					path: ["currentPassword"],
					message:
						"Current password is required to change your email or password.",
				});
			}

			if (!updatesCredentials && data.currentPassword) {
				ctx.addIssue({
					code: "custom",
					path: ["currentPassword"],
					message:
						"Current password can only be used when changing your email or password.",
				});
			}
		}),

	requestAccountDeletion: z.object({
		reason: z
			.string("Reason must be a string.")
			.trim()
			.max(500, "Reason must be at most 500 characters long.")
			.optional(),
	}),
};
