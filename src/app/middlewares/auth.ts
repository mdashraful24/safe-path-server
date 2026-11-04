import httpStatus from "http-status";
import type { Role } from "../../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { jwtUtils } from "../utils/jwt";

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

const getToken = (req: {
	cookies?: { accessToken?: string };
	headers: { authorization?: string };
}): string | null => {
	const token = req.cookies?.accessToken
		? req.cookies.accessToken
		: req.headers.authorization?.startsWith("Bearer ")
			? req.headers.authorization.split(" ")[1]
			: req.headers.authorization;

	return token ?? null;
};

export const requireAuth = catchAsync(async (req, _res, next) => {
	const token = getToken(req);

	if (!token) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			"You are not logged in. Please log in to continue.",
		);
	}

	const verified = jwtUtils.verifyToken(token, config.jwt_access_secret);

	if (!verified.success || !verified.data) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			"Your session has expired or is invalid. Please log in again.",
		);
	}

	const { userId, tv } = verified.data as { userId: string; tv: number };

	const user = await prisma.user.findUnique({
		where: { id: userId },
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
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			"This account is no longer available.",
		);
	}

	if (user.status === "BLOCKED") {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Your account has been blocked. Please contact an administrator.",
		);
	}

	if (!user.emailVerified) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Your email address is not verified. Please verify it to continue.",
		);
	}

	if (user.tokenVersion !== tv) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
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
});

export const currentUser = (req: { user?: AuthUser }): AuthUser => {
	if (!req.user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Authentication is required.");
	}
	return req.user;
};
