import type { Response } from "express";

type TResponse<T> = {
	success: boolean;
	statusCode: number;
	message: string;
	data?: T;
	meta?: unknown;
};

export const sendResponse = <T>(res: Response, payload: TResponse<T>) => {
	res.status(payload.statusCode).json(payload);
};
