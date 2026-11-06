import httpStatus from "http-status";
import { currentUser } from "../../middlewares/auth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type {
	ICreateCommentPayload,
	IUpdateCommentPayload,
} from "./comment.interface";
import { CommentService } from "./comment.service";
import { parseCommentListQuery } from "./comment.validation";

const listComments = catchAsync(async (req, res) => {
	const result = await CommentService.listComments(
		String(req.params.incidentId),
		parseCommentListQuery(req.query),
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Comments fetched successfully.",
		data: result.data,
		meta: result.meta,
	});
});

const createComment = catchAsync(async (req, res) => {
	const comment = await CommentService.createComment(
		currentUser(req).id,
		String(req.params.incidentId),
		req.body as ICreateCommentPayload,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Comment posted successfully.",
		data: comment,
	});
});

const updateMyComment = catchAsync(async (req, res) => {
	const comment = await CommentService.updateMyComment(
		currentUser(req).id,
		String(req.params.incidentId),
		String(req.params.commentId),
		req.body as IUpdateCommentPayload,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Comment updated successfully.",
		data: comment,
	});
});

const deleteMyComment = catchAsync(async (req, res) => {
	const result = await CommentService.deleteMyComment(
		currentUser(req).id,
		String(req.params.incidentId),
		String(req.params.commentId),
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Comment deleted successfully.",
		data: result,
	});
});

const deleteCommentForAdmin = catchAsync(async (req, res) => {
	const result = await CommentService.deleteCommentForAdmin(
		String(req.params.incidentId),
		String(req.params.commentId),
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Comment deleted successfully.",
		data: result,
	});
});

export const CommentController = {
	listComments,
	createComment,
	updateMyComment,
	deleteMyComment,
	deleteCommentForAdmin,
};
