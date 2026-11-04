import { rateLimit } from "express-rate-limit";
import httpStatus from "http-status";

const base = {
	standardHeaders: "draft-8",
	legacyHeaders: false,
} as const;

const tooMany = (message: string) => ({
	success: false,
	statusCode: httpStatus.TOO_MANY_REQUESTS,
	message,
});

export const authLimiter = rateLimit({
	...base,
	windowMs: 15 * 60 * 1000,
	limit: 100,
	message: tooMany("Too many requests. Please try again later."),
});

export const loginLimiter = rateLimit({
	...base,
	windowMs: 15 * 60 * 1000,
	limit: 10,
	skipSuccessfulRequests: true,
	message: tooMany(
		"Too many failed login attempts. Please try again in 15 minutes.",
	),
});

export const registerLimiter = rateLimit({
	...base,
	windowMs: 60 * 60 * 1000,
	limit: 10,
	message: tooMany(
		"Too many accounts created from this address. Please try again later.",
	),
});

export const otpLimiter = rateLimit({
	...base,
	windowMs: 15 * 60 * 1000,
	limit: 10,
	message: tooMany(
		"Too many verification attempts. Please try again in 15 minutes.",
	),
});
