import { isEmailConfigured, transporter } from "../lib/nodemailer";
import config from "../config";

type RegistrationOtpEmail = {
	to: string;
	name: string;
	otp: string;
	expiresInMinutes: number;
};

export const sendRegistrationOtpEmail = async ({
	to,
	name,
	otp,
	expiresInMinutes,
}: RegistrationOtpEmail): Promise<void> => {
	if (config.node_env === "development") {
		console.log(`[dev] Registration OTP for ${to}: ${otp}`);
	}

	if (!isEmailConfigured) {
		if (config.node_env === "production") {
			throw new Error("SMTP is not configured, cannot send the OTP email.");
		}

		return;
	}

	const text = [
		`Hi ${name},`,
		"",
		"Welcome to SafePath!",
		"",
		`Your verification code is: ${otp}`,
		"",
		`This code expires in ${expiresInMinutes} minutes.`,
		"",
		"If you did not create an account, you can safely ignore this email.",
		"No account is created unless this verification code is entered.",
		"",
		"SafePath - Personal Safety & Incident Reporting Platform",
	].join("\n");

	await transporter.sendMail({
		from: config.email_sender || config.smtp_user,
		to,
		subject: "Verify Your Email - SafePath",
		text,
	});
};

const shouldSkipEmail = (): boolean => {
	if (!isEmailConfigured) {
		if (config.node_env === "production") {
			throw new Error("SMTP is not configured, cannot send the email.");
		}

		return true;
	}

	return false;
};

export const sendPasswordResetOtpEmail = async ({
	to,
	name,
	otp,
	expiresInMinutes,
}: RegistrationOtpEmail): Promise<void> => {
	if (config.node_env === "development") {
		console.log(`[dev] Password reset OTP for ${to}: ${otp}`);
	}

	if (shouldSkipEmail()) return;

	const text = [
		`Hi ${name},`,
		"",
		"We received a request to reset the password for your SafePath account.",
		"",
		`Your verification code is: ${otp}`,
		"",
		`This code expires in ${expiresInMinutes} minutes.`,
		"",
		"If you did not request a password reset, you can safely ignore this email.",
		"Your password will not change unless this verification code is entered.",
		"",
		"SafePath - Personal Safety & Incident Reporting Platform",
	].join("\n");

	await transporter.sendMail({
		from: config.email_sender || config.smtp_user,
		to,
		subject: "Reset Your Password - SafePath",
		text,
	});
};

export const sendPasswordChangedEmail = async ({
	to,
	name,
}: {
	to: string;
	name: string;
}): Promise<void> => {
	if (shouldSkipEmail()) return;

	const text = [
		`Hi ${name},`,
		"",
		"The password for your SafePath account was changed successfully.",
		"",
		"All previously active sessions have been signed out.",
		"",
		"If you did not make this change, reset your password immediately and contact support.",
		"",
		"SafePath - Personal Safety & Incident Reporting Platform",
	].join("\n");

	await transporter.sendMail({
		from: config.email_sender || config.smtp_user,
		to,
		subject: "Your SafePath Password Was Changed",
		text,
	});
};

export const sendWelcomeEmail = async ({
	to,
	name,
}: {
	to: string;
	name: string;
}): Promise<void> => {
	if (shouldSkipEmail()) return;

	const text = [
		`Hi ${name},`,
		"",
		"Your SafePath email address has been verified and your account is ready.",
		"",
		"You can now report incidents, browse nearby reports, and stay informed about safety in your area.",
		"",
		"SafePath - Personal Safety & Incident Reporting Platform",
	].join("\n");

	await transporter.sendMail({
		from: config.email_sender || config.smtp_user,
		to,
		subject: "Welcome to SafePath",
		text,
	});
};
