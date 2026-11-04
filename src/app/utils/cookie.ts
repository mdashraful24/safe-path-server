import type { CookieOptions, Response } from "express";
import config from "../config";

const cookieOptions = (maxAge: number): CookieOptions => ({
	httpOnly: true,
	secure: config.node_env !== "development",
	sameSite: config.node_env === "development" ? "lax" : "none",
	maxAge,
});

export const setAuthCookies = (
	res: Response,
	tokens: { accessToken: string; refreshToken: string },
) => {
	res.cookie(
		"accessToken",
		tokens.accessToken,
		cookieOptions(1000 * 60 * 60 * 24),
	);
	res.cookie(
		"refreshToken",
		tokens.refreshToken,
		cookieOptions(1000 * 60 * 60 * 24 * 7),
	);
};

export const clearAuthCookies = (res: Response) => {
	res.clearCookie("accessToken");
	res.clearCookie("refreshToken");
};
