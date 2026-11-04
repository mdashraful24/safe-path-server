import config from "../config";
import { transporter } from "../lib/nodemailer";

const isEmailConfigured = Boolean(config.smtp_user && config.smtp_password);

type Email = { to: string; name: string };
type OtpEmail = Email & { otp: string; expiresInMinutes: number };

const signature = "SafePath - Personal Safety & Incident Reporting Platform";

const send = async (to: string, subject: string, text: string) => {
	if (!isEmailConfigured) {
		if (config.node_env === "production") {
			throw new Error("SMTP is not configured, cannot send email.");
		}
		return;
	}

	await transporter.sendMail({
		from: config.email_sender || config.smtp_user,
		to,
		subject,
		text,
	});
};

export const sendRegistrationOtpEmail = async ({
	to,
	name,
	otp,
	expiresInMinutes,
}: OtpEmail): Promise<void> => {
	if (config.node_env === "development") {
		console.log(`[dev] Registration OTP for ${to}: ${otp}`);
	}

	await send(
		to,
		"Verify Your Email - SafePath",
		[
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
			signature,
		].join("\n"),
	);
};

export const sendPasswordResetOtpEmail = async ({
	to,
	name,
	otp,
	expiresInMinutes,
}: OtpEmail): Promise<void> => {
	if (config.node_env === "development") {
		console.log(`[dev] Password reset OTP for ${to}: ${otp}`);
	}

	await send(
		to,
		"Reset Your Password - SafePath",
		[
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
			signature,
		].join("\n"),
	);
};

export const sendPasswordChangedEmail = async ({
	to,
	name,
}: Email): Promise<void> => {
	await send(
		to,
		"Your SafePath Password Was Changed",
		[
			`Hi ${name},`,
			"",
			"The password for your SafePath account was changed successfully.",
			"",
			"If you did not make this change, reset your password immediately and contact support.",
			"",
			signature,
		].join("\n"),
	);
};

export const sendWelcomeEmail = async ({ to, name }: Email): Promise<void> => {
	await send(
		to,
		"Welcome to SafePath",
		[
			`Hi ${name},`,
			"",
			"Your SafePath email address has been verified and your account is ready.",
			"",
			"You can now report incidents, browse nearby reports, and stay informed about safety in your area.",
			"",
			signature,
		].join("\n"),
	);
};
