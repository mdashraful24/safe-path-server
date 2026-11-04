import bcrypt from "bcryptjs";
import config from "../config";

export const BCRYPT_MAX_BYTES = 72;

export const passwordFitsBcrypt = (password: string): boolean => {
	return Buffer.byteLength(password, "utf8") <= BCRYPT_MAX_BYTES;
};

export const hashPassword = async (password: string): Promise<string> => {
	if (!passwordFitsBcrypt(password)) {
		throw new Error("Password exceeds the bcrypt 72-byte limit.");
	}
	return bcrypt.hash(password, config.bcrypt_salt_rounds);
};

export const verifyPassword = async (
	password: string,
	passwordHash: string,
): Promise<boolean> => {
	if (!passwordFitsBcrypt(password)) return false;
	return bcrypt.compare(password, passwordHash);
};

export const DUMMY_PASSWORD_HASH =
	"$2b$12$cGfy0r41Aj2pPUB6SOGU0.jUrqCtSAsG6cuG7bGggcSfG92fguqTW";
