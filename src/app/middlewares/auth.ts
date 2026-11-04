import type { NextFunction, Request, Response } from "express";
import type { Role } from "../../../generated/prisma/enums";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { ACCESS_TOKEN_COOKIE } from "../utils/cookie";
import { verifyAccessToken } from "../utils/jwt";

export type AuthUser = {
	id: string;
	name: string;
	email: string;
	role: Role;
};

declare global {
	namespace Express {
		interface Request {
			user?: AuthUser;
		}
	}
}

const extractAccessToken = (req: Request): string | null => {
	const cookieToken = req.cookies?.[ACCESS_TOKEN_COOKIE];
	if (typeof cookieToken === "string" && cookieToken.length > 0) {
		return cookieToken;
	}

	const header = req.headers.authorization;
	if (!header) return null;

	const [scheme, value] = header.split(" ");
	if (scheme?.toLowerCase() !== "bearer" || !value) return null;

	return value;
};

export const requireAuth = catchAsync(
	async (req: Request, _res: Response, next: NextFunction) => {
		const token = extractAccessToken(req);

		if (!token) {
			throw AppError.unauthorized(
				"You are not logged in. Please log in to continue.",
			);
		}

		const verified = verifyAccessToken(token);

		if (!verified.ok) {
			throw AppError.unauthorized(
				verified.reason === "Token has expired"
					? "Your session has expired. Please log in again."
					: "Invalid authentication token.",
			);
		}

		const { sub, tv } = verified.payload;

		const user = await prisma.user.findUnique({
			where: { id: sub },
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				status: true,
				isDeleted: true,
				emailVerified: true,
				tokenVersion: true,
			},
		});

		if (!user || user.isDeleted || user.status === "DELETED") {
			throw AppError.unauthorized("This account is no longer available.");
		}

		if (user.status === "BLOCKED") {
			throw AppError.forbidden(
				"Your account has been blocked. Please contact an administrator.",
			);
		}

		if (!user.emailVerified) {
			throw AppError.forbidden(
				"Your email address is not verified. Please verify it to continue.",
			);
		}

		if (user.tokenVersion !== tv) {
			throw AppError.unauthorized(
				"Your session is no longer valid. Please log in again.",
			);
		}

		req.user = {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
		};

		next();
	},
);

export const requireRole =
	(...roles: Role[]) =>
	(req: Request, _res: Response, next: NextFunction) => {
		if (!req.user) {
			next(AppError.unauthorized());
			return;
		}

		if (!roles.includes(req.user.role)) {
			next(
				AppError.forbidden(
					"You do not have permission to perform this action.",
				),
			);
			return;
		}

		next();
	};

export const currentUser = (req: { user?: AuthUser }): AuthUser => {
	if (!req.user) {
		throw AppError.unauthorized();
	}
	return req.user;
};
