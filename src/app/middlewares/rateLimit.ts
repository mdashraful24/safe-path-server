import { rateLimit } from "express-rate-limit";
import httpStatus from "http-status";

const tooMany = (message: string) => ({
	success: false,
	statusCode: httpStatus.TOO_MANY_REQUESTS,
	message,
});

const common = {
	standardHeaders: "draft-8",
	legacyHeaders: false,
	windowMs: 15 * 60 * 1000,
} as const;

export const authLimiter = rateLimit({
	...common,
	limit: 100,
	message: tooMany("Too many requests. Please try again later."),
});

export const loginLimiter = rateLimit({
	...common,
	limit: 10,
	skipSuccessfulRequests: true,
	message: tooMany(
		"Too many failed login attempts. Please try again in 15 minutes.",
	),
});

export const otpLimiter = rateLimit({
	...common,
	limit: 10,
	skipSuccessfulRequests: true,
	message: tooMany(
		"Too many verification attempts. Please try again in 15 minutes.",
	),
});
