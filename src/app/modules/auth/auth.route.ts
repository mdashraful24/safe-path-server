import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import {
	authLimiter,
	loginLimiter,
	otpLimiter,
} from "../../middlewares/rateLimit";
import { validateRequest } from "../../middlewares/validateRequest";
import { AuthController } from "./auth.controller";
import { authValidation } from "./auth.validation";

const router = Router();

router.post(
	"/register",
	authLimiter,
	validateRequest(authValidation.register),
	AuthController.register,
);

router.post(
	"/verify-email",
	authLimiter,
	validateRequest(authValidation.verifyEmail),
	AuthController.verifyEmail,
);

router.post(
	"/resend-otp",
	authLimiter,
	validateRequest(authValidation.resendRegistrationOtp),
	AuthController.resendRegistrationOtp,
);

router.post(
	"/login",
	loginLimiter,
	validateRequest(authValidation.login),
	AuthController.login,
);

router.post(
	"/google",
	loginLimiter,
	validateRequest(authValidation.googleLogin),
	AuthController.googleLogin,
);

router.get("/me", requireAuth, AuthController.getMe);

router.post("/refresh-token", authLimiter, AuthController.refreshToken);

router.post(
	"/forgot-password",
	authLimiter,
	validateRequest(authValidation.forgotPassword),
	AuthController.forgotPassword,
);

router.post(
	"/resend-forgot-password-otp",
	authLimiter,
	validateRequest(authValidation.forgotPassword),
	AuthController.resendForgotPasswordOtp,
);

router.post(
	"/reset-password",
	authLimiter,
	validateRequest(authValidation.resetPassword),
	AuthController.resetPassword,
);

router.post(
	"/restore/request",
	authLimiter,
	validateRequest(authValidation.requestAccountRestore),
	AuthController.requestAccountRestore,
);

router.post(
	"/restore/verify",
	otpLimiter,
	validateRequest(authValidation.verifyAccountRestore),
	AuthController.verifyAccountRestore,
);

router.post("/logout", authLimiter, AuthController.logout);

export const AuthRoutes = router;
