import bcrypt from "bcryptjs";
import config from "../config";

export const hashPassword = (password: string): Promise<string> => {
	return bcrypt.hash(password, Number(config.bcrypt_salt_rounds));
};

export const verifyPassword = (
	password: string,
	passwordHash: string,
): Promise<boolean> => {
	return bcrypt.compare(password, passwordHash);
};
