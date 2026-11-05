import { randomInt } from "node:crypto";
import httpStatus from "http-status";
import { Role, UserStatus } from "../../../../generated/prisma/enums";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis";
import { AppError } from "../../utils/AppError";
import {
	sendPasswordChangedEmail,
	sendPasswordResetOtpEmail,
	sendRegistrationOtpEmail,
	sendWelcomeEmail,
} from "../../utils/email";
import { jwtUtils } from "../../utils/jwt";
import { hashPassword, verifyPassword } from "../../utils/password";
import type {
	IForgotPasswordPayload,
	ILoginPayload,
	IRegisterPayload,
	IResendRegistrationOtpPayload,
	IResetPasswordPayload,
	IVerifyEmailPayload,
} from "./auth.interface";

const OTP_EXPIRATION_IN_SECONDS =
	Number(config.otp_expires_in_seconds) || 2 * 60;
const REGISTRATION_SESSION_EXPIRATION_IN_SECONDS =
	Number(config.registration_session_expires_in_seconds) || 5 * 60;

type PendingRegistration = {
	name: string;
	email: string;
	passwordHash: string;
};

type TokenUser = {
	id: string;
	name: string;
	email: string;
	role: Role;
	tokenVersion: number;
};

const createTokens = (user: TokenUser) => {
	const payload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
		tv: user.tokenVersion,
	};

	return {
		accessToken: jwtUtils.createToken(
			payload,
			config.jwt_access_secret,
			config.jwt_access_expires_in,
		),
		refreshToken: jwtUtils.createToken(
			payload,
			config.jwt_refresh_secret,
			config.jwt_refresh_expires_in,
		),
	};
};

const register = async (payload: IRegisterPayload) => {
	const name = payload.name.trim();
	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({ where: { email } });

	if (isUserExists) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User with this email already exists.",
		);
	}

	const passwordHash = await hashPassword(payload.password);
	const otp = randomInt(100000, 1000000).toString();

	const otpKey = `registration-otp:${email}`;
	const registrationKey = `registration-data:${email}`;

	await redisClient.set(otpKey, otp, {
		expiration: { type: "EX", value: OTP_EXPIRATION_IN_SECONDS },
	});

	await redisClient.set(
		registrationKey,
		JSON.stringify({ name, email, passwordHash }),
		{
			expiration: {
				type: "EX",
				value: REGISTRATION_SESSION_EXPIRATION_IN_SECONDS,
			},
		},
	);

	await sendRegistrationOtpEmail({
		to: email,
		name,
		otp,
		expiresInMinutes: OTP_EXPIRATION_IN_SECONDS / 60,
	});

	return {
		expiresIn: OTP_EXPIRATION_IN_SECONDS,
		expiresAt: new Date(
			Date.now() + OTP_EXPIRATION_IN_SECONDS * 1000,
		).toISOString(),
		sessionExpiresIn: REGISTRATION_SESSION_EXPIRATION_IN_SECONDS,
	};
};

const resendRegistrationOtp = async (
	payload: IResendRegistrationOtpPayload,
) => {
	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({ where: { email } });

	if (isUserExists) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User with this email already exists.",
		);
	}

	const registrationKey = `registration-data:${email}`;
	const redisUserData = await redisClient.get(registrationKey);

	if (!redisUserData) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Registration session has expired. Please register again.",
		);
	}

	const userData = JSON.parse(redisUserData) as PendingRegistration;
	const otp = randomInt(100000, 1000000).toString();
	const otpKey = `registration-otp:${email}`;

	await redisClient.set(otpKey, otp, {
		expiration: { type: "EX", value: OTP_EXPIRATION_IN_SECONDS },
	});

	await redisClient.expire(
		registrationKey,
		REGISTRATION_SESSION_EXPIRATION_IN_SECONDS,
	);

	await sendRegistrationOtpEmail({
		to: userData.email,
		name: userData.name,
		otp,
		expiresInMinutes: OTP_EXPIRATION_IN_SECONDS / 60,
	});

	return {
		expiresIn: OTP_EXPIRATION_IN_SECONDS,
		expiresAt: new Date(
			Date.now() + OTP_EXPIRATION_IN_SECONDS * 1000,
		).toISOString(),
		sessionExpiresIn: REGISTRATION_SESSION_EXPIRATION_IN_SECONDS,
	};
};

const verifyEmail = async (payload: IVerifyEmailPayload) => {
	const email = payload.email.trim().toLowerCase();
	const otp = payload.otp.trim();

	const isUserExists = await prisma.user.findUnique({ where: { email } });

	if (isUserExists?.emailVerified) {
		throw new AppError(httpStatus.BAD_REQUEST, "Email is already verified.");
	}

	if (isUserExists) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User with this email already exists.",
		);
	}

	const otpKey = `registration-otp:${email}`;
	const redisOtp = await redisClient.get(otpKey);

	if (!redisOtp) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP is expired or invalid.");
	}

	if (redisOtp !== otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP is not valid.");
	}

	await redisClient.del(otpKey);

	const registrationKey = `registration-data:${email}`;
	const redisUserData = await redisClient.get(registrationKey);

	if (!redisUserData) {
		throw new AppError(httpStatus.BAD_REQUEST, "Registration data is missing.");
	}

	const userData = JSON.parse(redisUserData) as PendingRegistration;

	const user = await prisma.user.create({
		data: {
			name: userData.name,
			email: userData.email,
			passwordHash: userData.passwordHash,
			role: Role.USER,
			emailVerified: true,
			emailVerifiedAt: new Date(),
		},
		omit: { passwordHash: true },
	});

	await redisClient.del(registrationKey);

	await sendWelcomeEmail({ to: user.email, name: user.name });

	return {
		user,
		...createTokens(user),
	};
};

const login = async (payload: ILoginPayload) => {
	const email = payload.email.trim().toLowerCase();
	const user = await prisma.user.findUnique({ where: { email } });

	if (!user) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password.");
	}

	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new AppError(httpStatus.FORBIDDEN, "User is deleted.");
	}

	if (user.status === UserStatus.PENDING_DELETION) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Your account deletion request is pending administrator approval.",
		);
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new AppError(httpStatus.FORBIDDEN, "User is blocked.");
	}

	if (!user.emailVerified) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Please verify your email address before logging in.",
		);
	}

	const isPasswordMatched = await verifyPassword(
		payload.password,
		user.passwordHash,
	);

	if (!isPasswordMatched) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid email or password.");
	}

	return createTokens(user);
};

const getMe = async (userId: string) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		omit: { passwordHash: true },
	});

	if (!user || user.isDeleted || user.status === UserStatus.DELETED) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found.");
	}

	return user;
};

const refresh = async (token: string | null) => {
	if (!token) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Refresh token is missing.");
	}

	const verified = jwtUtils.verifyToken(token, config.jwt_refresh_secret);

	if (!verified.success || !verified.data) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			"Invalid or expired refresh token.",
		);
	}

	const data = verified.data as { userId: string };
	const user = await prisma.user.findUnique({
		where: { id: data.userId },
	});

	if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
		throw new AppError(
			httpStatus.UNAUTHORIZED,
			"User is inactive or not found.",
		);
	}

	return createTokens(user);
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
	const email = payload.email.trim().toLowerCase();
	const user = await prisma.user.findUnique({ where: { email } });

	if (
		user &&
		!user.isDeleted &&
		user.status === UserStatus.ACTIVE &&
		user.emailVerified &&
		user.role !== Role.ADMIN
	) {
		const otp = randomInt(100000, 1000000).toString();
		const key = `forgot-password:${email}`;

		await redisClient.set(key, otp, {
			expiration: { type: "EX", value: OTP_EXPIRATION_IN_SECONDS },
		});

		await sendPasswordResetOtpEmail({
			to: user.email,
			name: user.name,
			otp,
			expiresInMinutes: OTP_EXPIRATION_IN_SECONDS / 60,
		});
	}

	return {
		expiresIn: OTP_EXPIRATION_IN_SECONDS,
		expiresAt: new Date(
			Date.now() + OTP_EXPIRATION_IN_SECONDS * 1000,
		).toISOString(),
	};
};

const resetPassword = async (payload: IResetPasswordPayload) => {
	const email = payload.email.trim().toLowerCase();
	const otp = payload.otp.trim();

	const key = `forgot-password:${email}`;
	const redisOtp = await redisClient.get(key);

	if (!redisOtp || redisOtp !== otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP is expired or invalid.");
	}

	const user = await prisma.user.findUnique({ where: { email } });

	if (
		!user ||
		user.isDeleted ||
		user.status !== UserStatus.ACTIVE ||
		user.role === Role.ADMIN
	) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP is expired or invalid.");
	}

	const passwordHash = await hashPassword(payload.newPassword);

	await prisma.user.update({
		where: { id: user.id },
		data: { passwordHash },
	});

	await redisClient.del(key);

	await sendPasswordChangedEmail({ to: user.email, name: user.name });
};

export const AuthService = {
	register,
	resendRegistrationOtp,
	verifyEmail,
	login,
	getMe,
	refresh,
	forgotPassword,
	resendForgotPasswordOtp: forgotPassword,
	resetPassword,
};
