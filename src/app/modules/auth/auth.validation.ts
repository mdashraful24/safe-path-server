import { z } from "zod";

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

const otpSchema = z
	.string("Verification code is required.")
	.trim()
	.regex(/^\d{6}$/, "Verification code must be a 6-digit number.");

export const authValidation = {
	register: z.object({
		name: z
			.string("Name is required.")
			.trim()
			.min(2, "Name must be at least 2 characters long.")
			.max(100, "Name must be at most 100 characters long."),
		email: emailSchema,
		password: passwordSchema,
	}),

	verifyEmail: z.object({
		email: emailSchema,
		otp: otpSchema,
	}),

	resendRegistrationOtp: z.object({
		email: emailSchema,
	}),

	login: z.object({
		email: emailSchema,
		password: z
			.string("Password is required.")
			.min(1, "Password is required.")
			.max(72, "Password must be at most 72 characters long."),
	}),

	googleLogin: z
		.object({
			idToken: z
				.string("Google ID token is required.")
				.trim()
				.min(1, "Google ID token is required.")
				.max(10000, "Google ID token is too long."),
		})
		.strict(),

	forgotPassword: z.object({
		email: emailSchema,
	}),

	resetPassword: z.object({
		email: emailSchema,
		otp: otpSchema,
		newPassword: passwordSchema,
	}),

	requestAccountRestore: z.object({
		email: emailSchema,
	}),

	verifyAccountRestore: z.object({
		email: emailSchema,
		otp: otpSchema,
	}),
};
