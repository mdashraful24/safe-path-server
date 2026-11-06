import { randomInt } from "node:crypto";
import config from "../config";
import { redisClient } from "../lib/redis";
import { sendEmailChangeOtpEmail } from "./email";

export const EMAIL_CHANGE_OTP_EXPIRATION_IN_SECONDS =
	Number(config.otp_expires_in_seconds) || 2 * 60;

export type PendingEmailChange = {
	email: string;
	otp: string;
};

type CreatePendingEmailChangePayload = {
	userId: string;
	email: string;
	name: string;
};

const getEmailChangeKey = (userId: string) => `email-change:${userId}`;

export const createPendingEmailChange = async ({
	userId,
	email,
	name,
}: CreatePendingEmailChangePayload) => {
	const otp = randomInt(100000, 1000000).toString();
	const expiresAt = new Date(
		Date.now() + EMAIL_CHANGE_OTP_EXPIRATION_IN_SECONDS * 1000,
	);
	const key = getEmailChangeKey(userId);
	const pendingEmailChange: PendingEmailChange = { email, otp };

	await redisClient.set(key, JSON.stringify(pendingEmailChange), {
		expiration: {
			type: "EX",
			value: EMAIL_CHANGE_OTP_EXPIRATION_IN_SECONDS,
		},
	});

	try {
		await sendEmailChangeOtpEmail({
			to: email,
			name,
			otp,
			expiresInMinutes: EMAIL_CHANGE_OTP_EXPIRATION_IN_SECONDS / 60,
		});
	} catch (error) {
		await redisClient.del(key);
		throw error;
	}

	return {
		email,
		expiresIn: EMAIL_CHANGE_OTP_EXPIRATION_IN_SECONDS,
		expiresAt,
	};
};

export const getPendingEmailChange = async (
	userId: string,
): Promise<PendingEmailChange | null> => {
	const key = getEmailChangeKey(userId);
	const redisPendingEmailChange = await redisClient.get(key);

	if (!redisPendingEmailChange) {
		return null;
	}

	try {
		return JSON.parse(redisPendingEmailChange) as PendingEmailChange;
	} catch {
		await redisClient.del(key);

		return null;
	}
};

export const deletePendingEmailChange = async (userId: string) => {
	await redisClient.del(getEmailChangeKey(userId));
};
