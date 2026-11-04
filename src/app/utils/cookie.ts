import type { CookieOptions, Response } from "express";
import config from "../config";
import { parseDuration } from "./duration";

export const ACCESS_TOKEN_COOKIE = "sp_access_token";
export const REFRESH_TOKEN_COOKIE = "sp_refresh_token";

export const authCookieOptions = (): CookieOptions => ({
	httpOnly: true,
	secure: config.cookie_secure === "true",
	sameSite: config.cookie_same_site as CookieOptions["sameSite"],
	path: "/",
	domain: process.env.COOKIE_DOMAIN || undefined,
});

export const setAuthCookies = (
	res: Response,
	tokens: { accessToken: string; refreshToken: string },
) => {
	const base = authCookieOptions();

	res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
		...base,

		maxAge: parseDuration(config.jwt_access_expires_in),
	});

	res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
		...base,
		maxAge: parseDuration(config.jwt_refresh_expires_in),
	});
};

export const clearAuthCookies = (res: Response) => {
	const base = authCookieOptions();

	res.clearCookie(ACCESS_TOKEN_COOKIE, base);
	res.clearCookie(REFRESH_TOKEN_COOKIE, base);
};
