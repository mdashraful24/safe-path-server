import type { NextFunction, Request, RequestHandler, Response } from "express";

export const catchAsync = <
	P = Record<string, string>,
	ResBody = unknown,
	ReqBody = unknown,
	ReqQuery = unknown,
>(
	fn: (
		req: Request<P, ResBody, ReqBody, ReqQuery>,
		res: Response<ResBody>,
		next: NextFunction,
	) => Promise<unknown>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery> => {
	return (req, res, next) => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};
};
