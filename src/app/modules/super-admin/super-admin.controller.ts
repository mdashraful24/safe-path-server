import httpStatus from "http-status";
import { currentUser } from "../../middlewares/auth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type {
	IRejectPayload,
	IUpdateEmailPayload,
	IUpdatePasswordPayload,
	IUpdateUserRolePayload,
	IUpdateUserStatusPayload,
} from "./super-admin.interface";
import { SuperAdminService } from "./super-admin.service";

const listUsers = catchAsync(async (_req, res) => {
	const users = await SuperAdminService.listUsers();

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Users fetched successfully.",
		data: users,
	});
});

const listAdmins = catchAsync(async (_req, res) => {
	const admins = await SuperAdminService.listAdmins();

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Admins fetched successfully.",
		data: admins,
	});
});

const getUserDetails = catchAsync(async (req, res) => {
	const userId = String(req.params.userId);
	const user = await SuperAdminService.getUserDetails(
		currentUser(req).id,
		userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User details fetched successfully.",
		data: user,
	});
});

const updateUserStatus = catchAsync(async (req, res) => {
	const userId = String(req.params.userId);
	const user = await SuperAdminService.updateUserStatus(
		currentUser(req).id,
		userId,
		req.body as IUpdateUserStatusPayload,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User status updated successfully.",
		data: user,
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

const updateUserEmail = catchAsync(async (req, res) => {
	const userId = String(req.params.userId);
	const user = await SuperAdminService.updateUserEmail(
		userId,
		req.body as IUpdateEmailPayload,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User email updated successfully.",
		data: user,
	});
});

const updateUserPassword = catchAsync(async (req, res) => {
	const userId = String(req.params.userId);
	const result = await SuperAdminService.updateUserPassword(
		userId,
		req.body as IUpdatePasswordPayload,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User password updated successfully.",
		data: result,
	});
});

const getDeletionRequests = catchAsync(async (_req, res) => {
	const requests = await SuperAdminService.getDeletionRequests();

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Account deletion requests fetched successfully.",
		data: requests,
	});
});

const approveAccountDeletion = catchAsync(async (req, res) => {
	const userId = String(req.params.userId);
	const result = await SuperAdminService.approveAccountDeletion(userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Account deletion approved and the account was deleted.",
		data: result,
	});
});

const rejectAccountDeletion = catchAsync(async (req, res) => {
	const userId = String(req.params.userId);
	const result = await SuperAdminService.rejectAccountDeletion(
		userId,
		(req.body as IRejectPayload).reason,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Account deletion rejected. The account remains active.",
		data: result,
	});
});

const getChangeRequests = catchAsync(async (_req, res) => {
	const requests = await SuperAdminService.getChangeRequests();

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Admin change requests fetched successfully.",
		data: requests,
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
	listUsers,
	listAdmins,
	getUserDetails,
	updateUserStatus,
	updateUserRole,
	updateUserEmail,
	updateUserPassword,
	getDeletionRequests,
	approveAccountDeletion,
	rejectAccountDeletion,
	getChangeRequests,
	approveChangeRequest,
	rejectChangeRequest,
};
