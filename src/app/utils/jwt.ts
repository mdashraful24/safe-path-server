import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import type { Role } from "../../../generated/prisma/enums";

export type TokenPayload = {
	userId: string;
	name: string;
	email: string;
	role: Role;
	tv: number;
};

const createToken = (
	payload: TokenPayload,
	secret: string,
	expiresIn: string | number,
) => {
	return jwt.sign(payload, secret, { expiresIn } as SignOptions);
};

const verifyToken = (token: string, secret: string) => {
	try {
		const verifiedToken = jwt.verify(token, secret) as JwtPayload;

		return {
			success: true,
			data: verifiedToken,
		};
	} catch (error: unknown) {
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Token verification failed",
		};
	}
};

export const jwtUtils = {
	createToken,
	verifyToken,
};
