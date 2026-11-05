import type { Response } from "express";

type TMeta = {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
};

type TResponse<T> = {
	success: boolean;
	statusCode: number;
	message: string;
	data?: T;
	meta?: TMeta;
};

export const sendResponse = <T>(res: Response, payload: TResponse<T>) => {
	res.status(payload.statusCode).json({
		success: payload.success,
		statusCode: payload.statusCode,
		message: payload.message,
		data: payload.data,
		meta: payload.meta,
	});
};
