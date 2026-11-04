import { randomInt } from "node:crypto";
import { Prisma } from "../../../../generated/prisma/client";
import { Role, UserStatus } from "../../../../generated/prisma/enums";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis";
import logger from "../../logger";
import { AppError } from "../../utils/AppError";
import { parseDuration } from "../../utils/duration";
import {
	sendPasswordChangedEmail,
	sendPasswordResetOtpEmail,
	sendRegistrationOtpEmail,
	sendWelcomeEmail,
} from "../../utils/email";
import {
	createSessionId,
	hashToken,
	signAccessToken,
	signRefreshToken,
	verifyRefreshToken,
} from "../../utils/jwt";
import {
	DUMMY_PASSWORD_HASH,
	hashPassword,
	verifyPassword,
} from "../../utils/password";
import type {
	AuthResult,
	IClientMeta,
	IChangePasswordPayload,
	IForgotPasswordPayload,
	ILoginPayload,
	IRegisterPayload,
	IResendRegistrationOtpPayload,
	IResetPasswordPayload,
	IVerifyEmailPayload,
	PasswordOtpResult,
	PublicUser,
	RegistrationOtpResult,
} from "./auth.interface";

const OTP_LENGTH = 6;
const DEFAULT_OTP_EXPIRES_IN_SECONDS = 2 * 60;
const DEFAULT_REGISTRATION_SESSION_SECONDS = 5 * 60;

const publicUserSelect = {
	id: true,
	name: true,
	email: true,
	imageUrl: true,
	role: true,
	status: true,
	emailVerified: true,
	createdAt: true,
	lastLoginAt: true,
} as const;

type SessionUser = Pick<PublicUser, "id" | "name" | "email" | "role"> & {
	tokenVersion: number;
};

type PendingRegistration = {
	name: string;
	email: string;
	passwordHash: string;
};

const registrationDataKey = (email: string) =>
	`auth:registration:data:${email}`;
const registrationOtpKey = (email: string) => `auth:registration:otp:${email}`;
const forgotPasswordOtpKey = (email: string) =>
	`auth:forgot-password:otp:${email}`;

const readPositiveInt = (value: string | undefined, fallback: number) => {
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const otpExpiresInSeconds = () =>
	readPositiveInt(
		config.otp_expires_in_seconds,
		DEFAULT_OTP_EXPIRES_IN_SECONDS,
	);

const registrationSessionSeconds = () =>
	readPositiveInt(
		config.registration_session_expires_in_seconds,
		DEFAULT_REGISTRATION_SESSION_SECONDS,
	);

const expiryIso = (seconds: number) =>
	new Date(Date.now() + seconds * 1000).toISOString();

const generateOtp = () =>
	randomInt(10 ** (OTP_LENGTH - 1), 10 ** OTP_LENGTH).toString();

const toPublicUser = (user: PublicUser): PublicUser => ({
	id: user.id,
	name: user.name,
	email: user.email,
	imageUrl: user.imageUrl,
	role: user.role,
	status: user.status,
	emailVerified: user.emailVerified,
	createdAt: user.createdAt,
	lastLoginAt: user.lastLoginAt,
});

const parsePendingRegistration = (raw: string | null): PendingRegistration => {
	if (!raw) {
		throw AppError.badRequest(
			"Your registration session has expired. Please register again.",
		);
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw AppError.badRequest(
			"Your registration session is invalid. Please register again.",
		);
	}

	if (parsed === null || typeof parsed !== "object") {
		throw AppError.badRequest(
			"Your registration session is invalid. Please register again.",
		);
	}

	const record = parsed as Record<string, unknown>;
	const { name, email, passwordHash } = record;

	if (
		typeof name !== "string" ||
		typeof email !== "string" ||
		typeof passwordHash !== "string"
	) {
		throw AppError.badRequest(
			"Your registration session is invalid. Please register again.",
		);
	}

	return { name, email, passwordHash };
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isUniqueViolation = (error: unknown) =>
	error instanceof Prisma.PrismaClientKnownRequestError &&
	error.code === "P2002";

const buildSessionTokens = (user: SessionUser) => {
	const accessToken = signAccessToken({
		sub: user.id,
		email: user.email,
		name: user.name,
		role: user.role,
		tv: user.tokenVersion,
		type: "access",
	});

	const refreshToken = signRefreshToken({
		sub: user.id,
		jti: createSessionId(),
		tv: user.tokenVersion,
		type: "refresh",
	});

	const expiresAt = new Date(
		Date.now() + parseDuration(config.jwt_refresh_expires_in),
	);

	return {
		accessToken,
		refreshToken,
		tokenHash: hashToken(refreshToken),
		expiresAt,
	};
};

const issueSession = async (
	user: SessionUser,
	meta: IClientMeta,
	tx?: Prisma.TransactionClient,
) => {
	const db = tx ?? prisma;
	const tokens = buildSessionTokens(user);

	await db.session.create({
		data: {
			userId: user.id,
			tokenHash: tokens.tokenHash,
			userAgent: meta.userAgent ?? null,
			ipAddress: meta.ipAddress ?? null,
			expiresAt: tokens.expiresAt,
		},
	});

	return {
		accessToken: tokens.accessToken,
		refreshToken: tokens.refreshToken,
	};
};

const register = async (
	payload: IRegisterPayload,
): Promise<RegistrationOtpResult> => {
	const email = normalizeEmail(payload.email);
	const name = payload.name.trim();

	const existing = await prisma.user.findUnique({
		where: { email },
		select: { id: true },
	});

	if (existing) {
		throw AppError.conflict("An account with this email already exists.");
	}

	const otpSeconds = otpExpiresInSeconds();
	const sessionSeconds = registrationSessionSeconds();
	const otp = generateOtp();
	const passwordHash = await hashPassword(payload.password);

	const otpKey = registrationOtpKey(email);
	const dataKey = registrationDataKey(email);

	await redisClient.set(otpKey, otp, {
		expiration: { type: "EX", value: otpSeconds },
	});

	await redisClient.set(
		dataKey,
		JSON.stringify({ name, email, passwordHash }),
		{ expiration: { type: "EX", value: sessionSeconds } },
	);

	try {
		await sendRegistrationOtpEmail({
			to: email,
			name,
			otp,
			expiresInMinutes: Math.max(1, Math.ceil(otpSeconds / 60)),
		});
	} catch (error) {
		await redisClient.del([otpKey, dataKey]);
		throw error;
	}

	return {
		expiresIn: otpSeconds,
		expiresAt: expiryIso(otpSeconds),
		sessionExpiresIn: sessionSeconds,
	};
};

const resendRegistrationOtp = async (
	payload: IResendRegistrationOtpPayload,
): Promise<RegistrationOtpResult> => {
	const email = normalizeEmail(payload.email);

	const existing = await prisma.user.findUnique({
		where: { email },
		select: { id: true },
	});

	if (existing) {
		throw AppError.conflict("An account with this email already exists.");
	}

	const dataKey = registrationDataKey(email);
	const otpKey = registrationOtpKey(email);
	const pending = parsePendingRegistration(await redisClient.get(dataKey));

	const otpSeconds = otpExpiresInSeconds();
	const sessionSeconds = registrationSessionSeconds();
	const otp = generateOtp();

	await redisClient.set(otpKey, otp, {
		expiration: { type: "EX", value: otpSeconds },
	});
	await redisClient.expire(dataKey, sessionSeconds);

	try {
		await sendRegistrationOtpEmail({
			to: pending.email,
			name: pending.name,
			otp,
			expiresInMinutes: Math.max(1, Math.ceil(otpSeconds / 60)),
		});
	} catch (error) {
		await redisClient.del(otpKey);
		throw error;
	}

	return {
		expiresIn: otpSeconds,
		expiresAt: expiryIso(otpSeconds),
		sessionExpiresIn: sessionSeconds,
	};
};

const verifyEmail = async (
	payload: IVerifyEmailPayload,
	meta: IClientMeta,
): Promise<AuthResult> => {
	const email = normalizeEmail(payload.email);

	const existing = await prisma.user.findUnique({
		where: { email },
		select: { id: true, emailVerified: true },
	});

	if (existing?.emailVerified) {
		throw AppError.badRequest(
			"This email address is already verified. Please log in.",
		);
	}

	if (existing) {
		throw AppError.conflict("An account with this email already exists.");
	}

	const otpKey = registrationOtpKey(email);
	const dataKey = registrationDataKey(email);

	const storedOtp = await redisClient.get(otpKey);

	if (!storedOtp) {
		throw AppError.badRequest(
			"The verification code has expired. Please request a new one.",
		);
	}

	if (storedOtp !== payload.otp) {
		throw AppError.badRequest("The verification code is incorrect.");
	}

	const pending = parsePendingRegistration(await redisClient.get(dataKey));

	try {
		const result = await prisma.$transaction(async (tx) => {
			const created = await tx.user.create({
				data: {
					name: pending.name,
					email,
					passwordHash: pending.passwordHash,
					role: Role.USER,
					emailVerified: true,
					emailVerifiedAt: new Date(),
				},
				select: {
					...publicUserSelect,
					tokenVersion: true,
				},
			});

			const tokens = await issueSession(
				{
					id: created.id,
					name: created.name,
					email: created.email,
					role: created.role,
					tokenVersion: created.tokenVersion,
				},
				meta,
				tx,
			);

			return { user: toPublicUser(created), ...tokens };
		});

		await redisClient.del([otpKey, dataKey]);

		void sendWelcomeEmail({
			to: result.user.email,
			name: result.user.name,
		}).catch((error: unknown) => {
			logger.warn("Could not send the welcome email.", { error });
		});

		return result;
	} catch (error) {
		if (isUniqueViolation(error)) {
			throw AppError.conflict("An account with this email already exists.");
		}

		throw error;
	}
};

const login = async (
	payload: ILoginPayload,
	meta: IClientMeta,
): Promise<AuthResult> => {
	const email = normalizeEmail(payload.email);

	const user = await prisma.user.findUnique({
		where: { email },
		select: {
			...publicUserSelect,
			passwordHash: true,
			tokenVersion: true,
			isDeleted: true,
		},
	});

	const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
	const passwordMatches = await verifyPassword(payload.password, passwordHash);

	if (!user || !passwordMatches) {
		throw AppError.unauthorized("Invalid email or password.");
	}

	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw AppError.forbidden("This account is no longer available.");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw AppError.forbidden(
			"Your account has been blocked. Please contact an administrator.",
		);
	}

	if (!user.emailVerified) {
		throw AppError.forbidden(
			"Please verify your email address before logging in.",
		);
	}

	const updated = await prisma.user.update({
		where: { id: user.id },
		data: { lastLoginAt: new Date() },
		select: {
			...publicUserSelect,
			tokenVersion: true,
		},
	});

	const tokens = await issueSession(
		{
			id: updated.id,
			name: updated.name,
			email: updated.email,
			role: updated.role,
			tokenVersion: updated.tokenVersion,
		},
		meta,
	);

	return { user: toPublicUser(updated), ...tokens };
};

const getMe = async (userId: string): Promise<PublicUser> => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			...publicUserSelect,
			isDeleted: true,
		},
	});

	if (!user || user.isDeleted || user.status === UserStatus.DELETED) {
		throw AppError.unauthorized("This account is no longer available.");
	}

	return toPublicUser(user);
};

const refresh = async (
	token: string | null,
	meta: IClientMeta,
): Promise<AuthResult> => {
	if (!token) {
		throw AppError.unauthorized(
			"Your session has expired. Please log in again.",
		);
	}

	const verified = verifyRefreshToken(token);

	if (!verified.ok) {
		throw AppError.unauthorized(
			verified.reason === "Token has expired"
				? "Your session has expired. Please log in again."
				: "Your session is no longer valid. Please log in again.",
		);
	}

	const { sub, tv } = verified.payload;
	const tokenHash = hashToken(token);

	const session = await prisma.session.findUnique({
		where: { tokenHash },
		select: {
			id: true,
			userId: true,
			revokedAt: true,
			expiresAt: true,
		},
	});

	if (!session || session.userId !== sub) {
		throw AppError.unauthorized(
			"Your session is no longer valid. Please log in again.",
		);
	}

	if (session.revokedAt) {
		await prisma.session.updateMany({
			where: { userId: sub, revokedAt: null },
			data: {
				revokedAt: new Date(),
				revokedReason: "refresh_token_reuse",
			},
		});

		throw AppError.unauthorized(
			"Your session is no longer valid. Please log in again.",
		);
	}

	if (session.expiresAt.getTime() <= Date.now()) {
		await prisma.session.update({
			where: { id: session.id },
			data: { revokedAt: new Date(), revokedReason: "expired" },
		});

		throw AppError.unauthorized(
			"Your session has expired. Please log in again.",
		);
	}

	const user = await prisma.user.findUnique({
		where: { id: sub },
		select: {
			...publicUserSelect,
			tokenVersion: true,
			isDeleted: true,
		},
	});

	if (!user || user.isDeleted || user.status === UserStatus.DELETED) {
		throw AppError.unauthorized("This account is no longer available.");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw AppError.forbidden(
			"Your account has been blocked. Please contact an administrator.",
		);
	}

	if (!user.emailVerified) {
		throw AppError.forbidden(
			"Please verify your email address before continuing.",
		);
	}

	if (user.tokenVersion !== tv) {
		throw AppError.unauthorized(
			"Your session is no longer valid. Please log in again.",
		);
	}

	const tokens = await prisma.$transaction(async (tx) => {
		const revoked = await tx.session.updateMany({
			where: { id: session.id, revokedAt: null },
			data: {
				revokedAt: new Date(),
				revokedReason: "rotated",
				lastUsedAt: new Date(),
			},
		});

		if (revoked.count === 0) {
			throw AppError.unauthorized(
				"Your session is no longer valid. Please log in again.",
			);
		}

		return issueSession(
			{
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				tokenVersion: user.tokenVersion,
			},
			meta,
			tx,
		);
	});

	return { user: toPublicUser(user), ...tokens };
};

const logout = async (token: string | null): Promise<void> => {
	if (!token) return;

	await prisma.session.updateMany({
		where: { tokenHash: hashToken(token), revokedAt: null },
		data: { revokedAt: new Date(), revokedReason: "logout" },
	});
};

const forgotPassword = async (
	payload: IForgotPasswordPayload,
): Promise<PasswordOtpResult> => {
	const email = normalizeEmail(payload.email);
	const otpSeconds = otpExpiresInSeconds();

	const user = await prisma.user.findUnique({
		where: { email },
		select: {
			id: true,
			name: true,
			email: true,
			status: true,
			isDeleted: true,
			emailVerified: true,
		},
	});

	if (
		user &&
		!user.isDeleted &&
		user.status === UserStatus.ACTIVE &&
		user.emailVerified
	) {
		const otp = generateOtp();
		const key = forgotPasswordOtpKey(email);

		await redisClient.set(key, otp, {
			expiration: { type: "EX", value: otpSeconds },
		});

		try {
			await sendPasswordResetOtpEmail({
				to: user.email,
				name: user.name,
				otp,
				expiresInMinutes: Math.max(1, Math.ceil(otpSeconds / 60)),
			});
		} catch (error) {
			await redisClient.del(key);
			throw error;
		}
	}

	return {
		expiresIn: otpSeconds,
		expiresAt: expiryIso(otpSeconds),
	};
};

const resetPassword = async (payload: IResetPasswordPayload): Promise<void> => {
	const email = normalizeEmail(payload.email);
	const key = forgotPasswordOtpKey(email);
	const storedOtp = await redisClient.get(key);

	if (!storedOtp || storedOtp !== payload.otp) {
		throw AppError.badRequest(
			"The verification code is invalid or has expired.",
		);
	}

	const user = await prisma.user.findUnique({
		where: { email },
		select: {
			id: true,
			name: true,
			email: true,
			status: true,
			isDeleted: true,
			emailVerified: true,
		},
	});

	if (
		!user ||
		user.isDeleted ||
		user.status !== UserStatus.ACTIVE ||
		!user.emailVerified
	) {
		throw AppError.badRequest(
			"The verification code is invalid or has expired.",
		);
	}

	const passwordHash = await hashPassword(payload.newPassword);

	await prisma.$transaction([
		prisma.user.update({
			where: { id: user.id },
			data: {
				passwordHash,
				tokenVersion: { increment: 1 },
			},
		}),
		prisma.session.updateMany({
			where: { userId: user.id, revokedAt: null },
			data: {
				revokedAt: new Date(),
				revokedReason: "password_reset",
			},
		}),
	]);

	await redisClient.del(key);

	void sendPasswordChangedEmail({
		to: user.email,
		name: user.name,
	}).catch((error: unknown) => {
		logger.warn("Could not send the password changed email.", { error });
	});
};

const changePassword = async (
	userId: string,
	payload: IChangePasswordPayload,
	meta: IClientMeta,
): Promise<AuthResult> => {
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
			passwordHash: true,
		},
	});

	if (!user || user.isDeleted || user.status === UserStatus.DELETED) {
		throw AppError.unauthorized("This account is no longer available.");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw AppError.forbidden(
			"Your account has been blocked. Please contact an administrator.",
		);
	}

	if (!user.emailVerified) {
		throw AppError.forbidden(
			"Please verify your email address before continuing.",
		);
	}

	const currentPasswordMatches = await verifyPassword(
		payload.currentPassword,
		user.passwordHash,
	);

	if (!currentPasswordMatches) {
		throw AppError.badRequest("Your current password is incorrect.");
	}

	const matchesExistingPassword = await verifyPassword(
		payload.newPassword,
		user.passwordHash,
	);

	if (matchesExistingPassword) {
		throw AppError.badRequest(
			"New password must be different from the current password.",
		);
	}

	const passwordHash = await hashPassword(payload.newPassword);

	const result = await prisma.$transaction(async (tx) => {
		const updated = await tx.user.update({
			where: { id: user.id },
			data: {
				passwordHash,
				tokenVersion: { increment: 1 },
			},
			select: {
				...publicUserSelect,
				tokenVersion: true,
			},
		});

		await tx.session.updateMany({
			where: { userId: user.id, revokedAt: null },
			data: {
				revokedAt: new Date(),
				revokedReason: "password_change",
			},
		});

		const tokens = await issueSession(
			{
				id: updated.id,
				name: updated.name,
				email: updated.email,
				role: updated.role,
				tokenVersion: updated.tokenVersion,
			},
			meta,
			tx,
		);

		return { user: toPublicUser(updated), ...tokens };
	});

	void sendPasswordChangedEmail({
		to: result.user.email,
		name: result.user.name,
	}).catch((error: unknown) => {
		logger.warn("Could not send the password changed email.", { error });
	});

	return result;
};

export const AuthService = {
	register,
	verifyEmail,
	resendRegistrationOtp,
	login,
	getMe,
	refresh,
	logout,
	forgotPassword,
	resendForgotPasswordOtp: forgotPassword,
	resetPassword,
	changePassword,
};
