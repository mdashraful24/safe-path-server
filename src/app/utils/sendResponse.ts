import type { Response } from "express";

export type TMeta = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

type TResponse<T> = {
	statusCode: number;
	success: boolean;
	message: string;
	data?: T;
	meta?: TMeta;
};

export const sendResponse = <T>(res: Response, payload: TResponse<T>) => {
	const body: Record<string, unknown> = {
		success: payload.success,
		statusCode: payload.statusCode,
		message: payload.message,
	};

	if (payload.data !== undefined) body.data = payload.data;
	if (payload.meta) body.meta = payload.meta;

	res.status(payload.statusCode).json(body);
};
