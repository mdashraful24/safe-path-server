import { z } from "zod";

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

export const adminValidation = {
	updateUserStatus: z.object({
		status: z.enum(["ACTIVE", "BLOCKED"]),
	}),

	rejectDeletion: z.object({
		reason: reasonSchema,
	}),

	createChangeRequest: z.discriminatedUnion("type", [
		z.object({
			targetUserId: z.string().uuid("Target user ID must be a valid UUID."),
			type: z.literal("EMAIL"),
			reason: reasonSchema,
			requestedEmail: emailSchema,
		}),
		z.object({
			targetUserId: z.string().uuid("Target user ID must be a valid UUID."),
			type: z.literal("PASSWORD"),
			reason: reasonSchema,
			newPassword: passwordSchema,
		}),
	]),
};
