import { createHash, randomUUID } from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { Role } from "../../../generated/prisma/enums";
import config from "../config";

export type AccessTokenPayload = {
	sub: string;
	email: string;
	name: string;
	role: Role;

	tv: number;
	type: "access";
};

export type RefreshTokenPayload = {
	sub: string;

	jti: string;
	tv: number;
	type: "refresh";
};

type VerifyResult<T> = { ok: true; payload: T } | { ok: false; reason: string };

const commonOptions: SignOptions = {
	algorithm: "HS256",
	issuer: config.jwt_issuer,
	audience: config.jwt_audience,
};

export const signAccessToken = (payload: AccessTokenPayload): string => {
	return jwt.sign(payload, config.jwt_access_secret, {
		...commonOptions,
		expiresIn: config.jwt_access_expires_in as SignOptions["expiresIn"],
	});
};

export const signRefreshToken = (payload: RefreshTokenPayload): string => {
	const { jti, ...claims } = payload;

	return jwt.sign(claims, config.jwt_refresh_secret, {
		...commonOptions,
		expiresIn: config.jwt_refresh_expires_in as SignOptions["expiresIn"],
		jwtid: jti,
	});
};

const verify = <T extends { type: string }>(
	token: string,
	secret: string,
	expectedType: T["type"],
): VerifyResult<T> => {
	try {
		const decoded = jwt.verify(token, secret, {
			algorithms: ["HS256"],
			issuer: config.jwt_issuer,
			audience: config.jwt_audience,
		});

		if (typeof decoded === "string") {
			return { ok: false, reason: "Unexpected token payload" };
		}

		if (decoded.type !== expectedType) {
			return { ok: false, reason: "Unexpected token type" };
		}

		return { ok: true, payload: decoded as unknown as T };
	} catch (error) {
		if (error instanceof jwt.TokenExpiredError) {
			return { ok: false, reason: "Token has expired" };
		}
		if (error instanceof jwt.JsonWebTokenError) {
			return { ok: false, reason: "Token is invalid" };
		}
		return { ok: false, reason: "Token could not be verified" };
	}
};

export const verifyAccessToken = (token: string) =>
	verify<AccessTokenPayload>(token, config.jwt_access_secret, "access");

export const verifyRefreshToken = (token: string) =>
	verify<RefreshTokenPayload>(token, config.jwt_refresh_secret, "refresh");

export const hashToken = (token: string): string => {
	return createHash("sha256").update(token).digest("hex");
};

export const createSessionId = (): string => randomUUID();
