import nodemailer from "nodemailer";
import config from "../config";

export const isEmailConfigured = Boolean(
	config.smtp_user && config.smtp_password,
);

export const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: config.smtp_user,
		pass: config.smtp_password,
	},
});
