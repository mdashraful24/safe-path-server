import httpStatus from "http-status";
import { currentUser } from "../../middlewares/auth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type {
	IRejectPayload,
	IUpdateUserRolePayload,
} from "./super-admin.interface";
import { SuperAdminService } from "./super-admin.service";
import {
	parseAdminListQuery,
	parseChangeRequestListQuery,
} from "./super-admin.validation";

const listAdmins = catchAsync(async (req, res) => {
	const result = await SuperAdminService.listAdmins(
		currentUser(req).id,
		parseAdminListQuery(req.query),
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Admins fetched successfully.",
		data: result.data,
		meta: result.meta,
	});
});

const updateUserRole = catchAsync(async (req, res) => {
	const userId = String(req.params.userId);
	const user = await SuperAdminService.updateUserRole(
		currentUser(req).id,
		userId,
		req.body as IUpdateUserRolePayload,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User role updated successfully.",
		data: user,
	});
});

const getChangeRequests = catchAsync(async (req, res) => {
	const result = await SuperAdminService.getChangeRequests(
		parseChangeRequestListQuery(req.query),
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Admin change requests fetched successfully.",
		data: result.data,
		meta: result.meta,
	});
});

const approveChangeRequest = catchAsync(async (req, res) => {
	const requestId = String(req.params.requestId);
	const result = await SuperAdminService.approveChangeRequest(
		currentUser(req).id,
		requestId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Admin change request approved.",
		data: result,
	});
});

const rejectChangeRequest = catchAsync(async (req, res) => {
	const requestId = String(req.params.requestId);
	const result = await SuperAdminService.rejectChangeRequest(
		currentUser(req).id,
		requestId,
		(req.body as IRejectPayload).reason,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Admin change request rejected.",
		data: result,
	});
});

export const SuperAdminController = {
	listAdmins,
	updateUserRole,
	getChangeRequests,
	approveChangeRequest,
	rejectChangeRequest,
};
