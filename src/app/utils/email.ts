import config from "../config";
import { transporter } from "../lib/nodemailer";

const isEmailConfigured = Boolean(config.smtp_user && config.smtp_password);

type Email = { to: string; name: string };
type OtpEmail = Email & { otp: string; expiresInMinutes: number };
type ContactEmail = {
	name: string;
	email: string;
	topic: string;
	subject: string;
	message: string;
};
type ContactReplyEmail = {
	to: string;
	name: string;
	subject: string;
	reply: string;
	repliedBy: string;
};
type ChangeRequestEmail = {
	to: string;
	name: string;
	requesterName: string;
	requesterEmail: string;
	targetName: string;
	targetEmail: string;
	type: "EMAIL" | "PASSWORD";
	reason: string;
	requestedEmail?: string | null;
};

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

export const sendAccountRestoreOtpEmail = async ({
	to,
	name,
	otp,
	expiresInMinutes,
}: OtpEmail): Promise<void> => {
	if (config.node_env === "development") {
		console.log(`[dev] Account restore OTP for ${to}: ${otp}`);
	}

	await send(
		to,
		"Restore Your SafePath Account",
		[
			`Hi ${name},`,
			"",
			"We received a request to restore your SafePath account.",
			"",
			`Your verification code is: ${otp}`,
			"",
			`This code expires in ${expiresInMinutes} minutes.`,
			"",
			"If you did not request this, you can safely ignore this email.",
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

export const sendAccountDeletionApprovedEmail = async ({
	to,
	name,
	restoreDeadline,
}: Email & { restoreDeadline?: Date }): Promise<void> => {
	await send(
		to,
		"Your SafePath Account Has Been Deleted",
		[
			`Hi ${name},`,
			"",
			"Your account deletion request has been approved. Your SafePath profile has been deleted.",
			"",
			"You will no longer be able to sign in with this account.",
			...(restoreDeadline
				? [
						"",
						`You can restore this account until ${restoreDeadline.toUTCString()} using the account restore option.`,
					]
				: []),
			"If you believe this was a mistake, please contact support.",
			"",
			signature,
		].join("\n"),
	);
};

export const sendAccountDeletionRejectedEmail = async ({
	to,
	name,
	reason,
}: Email & { reason: string }): Promise<void> => {
	await send(
		to,
		"Your SafePath Account Deletion Request Was Not Approved",
		[
			`Hi ${name},`,
			"",
			"Your request to delete your SafePath account was reviewed and was not approved.",
			"",
			`Reason: ${reason}`,
			"",
			"Your account remains active. You can sign in again with your existing credentials.",
			"",
			"If you did not request account deletion, change your password immediately and contact support.",
			"",
			signature,
		].join("\n"),
	);
};

export const sendAccountRestoredEmail = async ({
	to,
	name,
}: Email): Promise<void> => {
	await send(
		to,
		"Your SafePath Account Has Been Restored",
		[
			`Hi ${name},`,
			"",
			"Your SafePath account has been restored successfully.",
			"",
			"You can now sign in and use your account again.",
			"",
			"If you did not request this restoration, change your password immediately and contact support.",
			"",
			signature,
		].join("\n"),
	);
};

export const sendAdminChangeRequestEmail = async ({
	to,
	name,
	requesterName,
	requesterEmail,
	targetName,
	targetEmail,
	type,
	reason,
	requestedEmail,
}: ChangeRequestEmail): Promise<void> => {
	await send(
		to,
		"New Admin Change Request - SafePath",
		[
			`Hi ${name},`,
			"",
			`${requesterName} (${requesterEmail}) submitted a request to change the ${type.toLowerCase()} for ${targetName} (${targetEmail}).`,
			"",
			`Reason: ${reason}`,
			...(requestedEmail ? ["", `Requested email: ${requestedEmail}`] : []),
			"",
			"Please review the request in the SafePath super admin panel.",
			"",
			signature,
		].join("\n"),
	);
};

export const sendAdminChangeRequestApprovedEmail = async ({
	to,
	name,
	type,
	pendingVerification = false,
}: Email & {
	type: "EMAIL" | "PASSWORD";
	pendingVerification?: boolean;
}): Promise<void> => {
	const statusMessage = pendingVerification
		? "was approved. A verification code has been sent to the new email address. Your current email remains active until you verify the new address."
		: "was approved and applied.";

	await send(
		to,
		"Admin Change Request Approved - SafePath",
		[
			`Hi ${name},`,
			"",
			`Your request to change the ${type.toLowerCase()} ${statusMessage}`,
			"",
			signature,
		].join("\n"),
	);
};

export const sendAdminChangeRequestRejectedEmail = async ({
	to,
	name,
	type,
	reason,
}: Email & { type: "EMAIL" | "PASSWORD"; reason: string }): Promise<void> => {
	await send(
		to,
		"Admin Change Request Rejected - SafePath",
		[
			`Hi ${name},`,
			"",
			`Your request to change the ${type.toLowerCase()} was rejected.`,
			"",
			`Reason: ${reason}`,
			"",
			signature,
		].join("\n"),
	);
};

export const sendEmailChangeOtpEmail = async ({
	to,
	name,
	otp,
	expiresInMinutes,
}: OtpEmail): Promise<void> => {
	if (config.node_env === "development") {
		console.log(`[dev] Email change OTP for ${to}: ${otp}`);
	}

	await send(
		to,
		"Verify Your New Email - SafePath",
		[
			`Hi ${name},`,
			"",
			"We received a request to change the email address for your SafePath account.",
			"",
			`Your verification code is: ${otp}`,
			"",
			`This code expires in ${expiresInMinutes} minutes.`,
			"",
			"If you did not request this change, you can safely ignore this email. Your email will not change.",
			"",
			signature,
		].join("\n"),
	);
};

export const sendEmailChangedEmail = async ({
	to,
	name,
	newEmail,
}: Email & { newEmail: string }): Promise<void> => {
	await send(
		to,
		"Your SafePath Email Was Changed",
		[
			`Hi ${name},`,
			"",
			`The email address for your SafePath account was changed to ${newEmail}.`,
			"",
			"If you did not make this change, contact support immediately.",
			"",
			signature,
		].join("\n"),
	);
};

export const sendGoogleSignInLinkedEmail = async ({
	to,
	name,
}: Email): Promise<void> => {
	await send(
		to,
		"Google Sign-In Linked - SafePath",
		[
			`Hi ${name},`,
			"",
			"Your Google account has been linked to your existing SafePath account.",
			"",
			"You can now sign in with either Google or your SafePath password.",
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

export const sendContactAcknowledgementEmail = async ({
	to,
	name,
	subject,
}: Email & { subject: string }): Promise<void> => {
	await send(
		to,
		"We received your message - SafePath",
		[
			`Hi ${name},`,
			"",
			"Thanks for contacting SafePath. We received your message and our team will review it.",
			"",
			`Subject: ${subject}`,
			"",
			"We usually respond within 1-2 business days.",
			"If your matter involves immediate danger, contact your local emergency services.",
			"",
			signature,
		].join("\n"),
	);
};

export const sendContactNotificationEmail = async ({
	name,
	email,
	topic,
	subject,
	message,
}: ContactEmail): Promise<void> => {
	const recipient = config.email_sender || config.smtp_user;

	if (!recipient) return;

	await send(
		recipient,
		`New contact message: ${subject}`,
		[
			"A new message was submitted through the SafePath contact form.",
			"",
			`Name: ${name}`,
			`Email: ${email}`,
			`Topic: ${topic}`,
			`Subject: ${subject}`,
			"",
			"Message:",
			message,
			"",
			signature,
		].join("\n"),
	);
};

export const sendContactReplyEmail = async ({
	to,
	name,
	subject,
	reply,
	repliedBy,
}: ContactReplyEmail): Promise<void> => {
	await send(
		to,
		`Re: ${subject} - SafePath`,
		[
			`Hi ${name},`,
			"",
			"Our team has replied to your message sent to SafePath.",
			"",
			`Subject: ${subject}`,
			"",
			"Reply:",
			reply,
			"",
			`— ${repliedBy}`,
			"",
			"If you need anything else, reply to this email or send us another message through the contact page.",
			"",
			signature,
		].join("\n"),
	);
};
