import httpStatus from "http-status";
import { currentUser } from "../../middlewares/auth";
import { catchAsync } from "../../utils/catchAsync";
import {
	REFRESH_TOKEN_COOKIE,
	clearAuthCookies,
	setAuthCookies,
} from "../../utils/cookie";
import { sendResponse } from "../../utils/sendResponse";
import type {
	IClientMeta,
	IChangePasswordPayload,
	IForgotPasswordPayload,
	ILoginPayload,
	IRegisterPayload,
	IResendRegistrationOtpPayload,
	IResetPasswordPayload,
	IVerifyEmailPayload,
} from "./auth.interface";
import { AuthService } from "./auth.service";

type RequestLike = {
	get: (name: string) => string | undefined;
	ip?: string;
	cookies?: Record<string, unknown>;
};

const clientMeta = (req: RequestLike): IClientMeta => ({
	userAgent: req.get("user-agent") ?? null,
	ipAddress: req.ip ?? null,
});

const getRefreshToken = (req: Pick<RequestLike, "cookies">): string | null => {
	const token = req.cookies?.[REFRESH_TOKEN_COOKIE];
	return typeof token === "string" && token.length > 0 ? token : null;
};

const register = catchAsync(async (req, res) => {
	const result = await AuthService.register(req.body as IRegisterPayload);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message:
			"Verification code sent. Please check your email to verify your account.",
		data: result,
	});
});

const verifyEmail = catchAsync(async (req, res) => {
	const result = await AuthService.verifyEmail(
		req.body as IVerifyEmailPayload,
		clientMeta(req),
	);

	setAuthCookies(res, result);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Email verified successfully. Welcome to SafePath.",
		data: result,
	});
});

const resendRegistrationOtp = catchAsync(async (req, res) => {
	const result = await AuthService.resendRegistrationOtp(
		req.body as IResendRegistrationOtpPayload,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "A new verification code has been sent to your email.",
		data: result,
	});
});

const login = catchAsync(async (req, res) => {
	const result = await AuthService.login(
		req.body as ILoginPayload,
		clientMeta(req),
	);

	setAuthCookies(res, result);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Logged in successfully.",
		data: result,
	});
});

const refreshToken = catchAsync(async (req, res) => {
	const result = await AuthService.refresh(
		getRefreshToken(req),
		clientMeta(req),
	);

	setAuthCookies(res, result);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Session refreshed successfully.",
		data: result,
	});
});

const logout = catchAsync(async (req, res) => {
	await AuthService.logout(getRefreshToken(req));
	clearAuthCookies(res);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Logged out successfully.",
	});
});

const getMe = catchAsync(async (req, res) => {
	const user = await AuthService.getMe(currentUser(req).id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Profile retrieved successfully.",
		data: user,
	});
});

const forgotPassword = catchAsync(async (req, res) => {
	const result = await AuthService.forgotPassword(
		req.body as IForgotPasswordPayload,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message:
			"If an account exists for that email, a verification code has been sent.",
		data: result,
	});
});

const resendForgotPasswordOtp = catchAsync(async (req, res) => {
	const result = await AuthService.resendForgotPasswordOtp(
		req.body as IForgotPasswordPayload,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message:
			"If an account exists for that email, a verification code has been sent.",
		data: result,
	});
});

const resetPassword = catchAsync(async (req, res) => {
	await AuthService.resetPassword(req.body as IResetPasswordPayload);
	clearAuthCookies(res);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message:
			"Password reset successfully. Please log in with your new password.",
	});
});

const changePassword = catchAsync(async (req, res) => {
	const result = await AuthService.changePassword(
		currentUser(req).id,
		req.body as IChangePasswordPayload,
		clientMeta(req),
	);

	setAuthCookies(res, result);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Password changed successfully.",
		data: result,
	});
});

export const AuthController = {
	register,
	verifyEmail,
	resendRegistrationOtp,
	login,
	refreshToken,
	logout,
	getMe,
	forgotPassword,
	resendForgotPasswordOtp,
	resetPassword,
	changePassword,
};
