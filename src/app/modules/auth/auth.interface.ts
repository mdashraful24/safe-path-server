import type { Role, UserStatus } from "../../../../generated/prisma/enums";

export interface IRegisterPayload {
	name: string;
	email: string;
	password: string;
}

export interface IVerifyEmailPayload {
	email: string;
	otp: string;
}

export interface IResendRegistrationOtpPayload {
	email: string;
}

export interface ILoginPayload {
	email: string;
	password: string;
}

export interface IForgotPasswordPayload {
	email: string;
}

export interface IResetPasswordPayload {
	email: string;
	otp: string;
	newPassword: string;
}

export interface IChangePasswordPayload {
	currentPassword: string;
	newPassword: string;
}

export interface IClientMeta {
	userAgent?: string | null;
	ipAddress?: string | null;
}

export type PublicUser = {
	id: string;
	name: string;
	email: string;
	imageUrl: string | null;
	role: Role;
	status: UserStatus;
	emailVerified: boolean;
	createdAt: Date;
	lastLoginAt: Date | null;
};

export type AuthResult = {
	user: PublicUser;
	accessToken: string;
	refreshToken: string;
};

export type RegistrationOtpResult = {
	expiresIn: number;
	expiresAt: string;
	sessionExpiresIn: number;
};

export type PasswordOtpResult = {
	expiresIn: number;
	expiresAt: string;
};
