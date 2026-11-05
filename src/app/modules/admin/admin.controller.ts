import httpStatus from "http-status";
import { currentUser } from "../../middlewares/auth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type {
	IAdminChangeRequestPayload,
	IRejectPayload,
	IUpdateUserStatusPayload,
} from "./admin.interface";
import { AdminService } from "./admin.service";

const listUsers = catchAsync(async (req, res) => {
	const result = await AdminService.listUsers(
		currentUser(req).role,
		req.query.page,
		req.query.limit,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Users fetched successfully.",
		data: result.data,
		meta: result.meta,
	});
});

const getUserDetails = catchAsync(async (req, res) => {
	const userId = String(req.params.userId);
	const user = await AdminService.getUserDetails(
		currentUser(req).role,
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
	const user = await AdminService.updateUserStatus(
		currentUser(req).role,
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

const getDeletionRequests = catchAsync(async (req, res) => {
	const result = await AdminService.getDeletionRequests(
		currentUser(req).role,
		req.query.page,
		req.query.limit,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Account deletion requests fetched successfully.",
		data: result.data,
		meta: result.meta,
	});
});

const approveAccountDeletion = catchAsync(async (req, res) => {
	const userId = String(req.params.userId);
	const result = await AdminService.approveAccountDeletion(
		currentUser(req).role,
		userId,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Account deletion approved and the account was deleted.",
		data: result,
	});
});

const rejectAccountDeletion = catchAsync(async (req, res) => {
	const userId = String(req.params.userId);
	const result = await AdminService.rejectAccountDeletion(
		currentUser(req).role,
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

const createChangeRequest = catchAsync(async (req, res) => {
	const request = await AdminService.createChangeRequest(
		currentUser(req).id,
		currentUser(req).role,
		req.body as IAdminChangeRequestPayload,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Change request submitted to the super admin.",
		data: request,
	});
});

export const AdminController = {
	listUsers,
	getUserDetails,
	updateUserStatus,
	getDeletionRequests,
	approveAccountDeletion,
	rejectAccountDeletion,
	createChangeRequest,
};
