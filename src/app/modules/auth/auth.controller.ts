import httpStatus from "http-status";
import { currentUser } from "../../middlewares/auth";
import { catchAsync } from "../../utils/catchAsync";
import { clearAuthCookies, setAuthCookies } from "../../utils/cookie";
import { sendResponse } from "../../utils/sendResponse";
import type {
	IForgotPasswordPayload,
	ILoginPayload,
	IRegisterPayload,
	IResendRegistrationOtpPayload,
	IResetPasswordPayload,
	IRestoreAccountRequestPayload,
	IVerifyAccountRestorePayload,
	IVerifyEmailPayload,
} from "./auth.interface";
import { AuthService } from "./auth.service";

const register = catchAsync(async (req, res) => {
	const result = await AuthService.register(req.body as IRegisterPayload);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message:
			"Verification OTP sent to your email. Please verify your email to complete the registration process.",
		data: result,
	});
});

const verifyEmail = catchAsync(async (req, res) => {
	const result = await AuthService.verifyEmail(req.body as IVerifyEmailPayload);

	setAuthCookies(res, result);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "User registered and email verified successfully.",
		// data: result,
	});
});

const resendRegistrationOtp = catchAsync(async (req, res) => {
	const result = await AuthService.resendRegistrationOtp(
		req.body as IResendRegistrationOtpPayload,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "A new verification OTP has been sent to your email.",
		data: result,
	});
});

const login = catchAsync(async (req, res) => {
	const result = await AuthService.login(req.body as ILoginPayload);

	setAuthCookies(res, result);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User logged in successfully.",
		data: result,
	});
});

const refreshToken = catchAsync(async (req, res) => {
	const result = await AuthService.refresh(req.cookies.refreshToken ?? null);

	setAuthCookies(res, result);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "New tokens generated successfully.",
		data: result,
	});
});

const logout = catchAsync(async (_req, res) => {
	clearAuthCookies(res);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User logged out successfully.",
	});
});

const getMe = catchAsync(async (req, res) => {
	const user = await AuthService.getMe(currentUser(req).id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User profile fetched successfully.",
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

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Password has been reset successfully.",
	});
});

const requestAccountRestore = catchAsync(async (req, res) => {
	const result = await AuthService.requestAccountRestore(
		req.body as IRestoreAccountRequestPayload,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message:
			"If the account is eligible for restoration, a verification code has been sent.",
		data: result,
	});
});

const verifyAccountRestore = catchAsync(async (req, res) => {
	const result = await AuthService.verifyAccountRestore(
		req.body as IVerifyAccountRestorePayload,
	);

	setAuthCookies(res, result);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Account restored successfully.",
		data: result.user,
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
	requestAccountRestore,
	verifyAccountRestore,
};
