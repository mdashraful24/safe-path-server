import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import {
	authLimiter,
	loginLimiter,
	otpLimiter,
	registerLimiter,
} from "../../middlewares/rateLimit";
import { validateBody } from "../../middlewares/validateRequest";
import { AuthController } from "./auth.controller";
import { authValidation } from "./auth.validation";

const router = Router();

router.post(
	"/register",
	registerLimiter,
	validateBody(authValidation.register),
	AuthController.register,
);

router.post(
	"/verify-email",
	otpLimiter,
	validateBody(authValidation.verifyEmail),
	AuthController.verifyEmail,
);

router.post(
	"/resend-registration-otp",
	otpLimiter,
	validateBody(authValidation.resendRegistrationOtp),
	AuthController.resendRegistrationOtp,
);

router.post(
	"/login",
	loginLimiter,
	validateBody(authValidation.login),
	AuthController.login,
);

router.post("/refresh-token", authLimiter, AuthController.refreshToken);

router.post("/logout", authLimiter, AuthController.logout);

router.get("/me", requireAuth, AuthController.getMe);

router.post(
	"/forgot-password",
	otpLimiter,
	validateBody(authValidation.forgotPassword),
	AuthController.forgotPassword,
);

router.post(
	"/resend-forgot-password-otp",
	otpLimiter,
	validateBody(authValidation.forgotPassword),
	AuthController.resendForgotPasswordOtp,
);

router.post(
	"/reset-password",
	otpLimiter,
	validateBody(authValidation.resetPassword),
	AuthController.resetPassword,
);

router.post(
	"/change-password",
	requireAuth,
	authLimiter,
	validateBody(authValidation.changePassword),
	AuthController.changePassword,
);

export const AuthRoutes = router;
