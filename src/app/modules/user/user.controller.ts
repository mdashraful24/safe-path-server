import httpStatus from "http-status";
import { currentUser } from "../../middlewares/auth";
import { catchAsync } from "../../utils/catchAsync";
import { clearAuthCookies } from "../../utils/cookie";
import { sendResponse } from "../../utils/sendResponse";
import type {
	IRequestAccountDeletionPayload,
	IUpdateProfilePayload,
} from "./user.interface";
import { UserService } from "./user.service";

const getProfile = catchAsync(async (req, res) => {
	const user = await UserService.getProfile(currentUser(req).id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Profile fetched successfully.",
		data: user,
	});
});

const updateProfile = catchAsync(async (req, res) => {
	const user = await UserService.updateProfile(
		currentUser(req).id,
		req.body as IUpdateProfilePayload,
		req.file,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Profile updated successfully.",
		data: user,
	});
});

const removeProfileImage = catchAsync(async (req, res) => {
	const user = await UserService.removeProfileImage(currentUser(req).id);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Profile picture removed successfully.",
		data: user,
	});
});

const requestAccountDeletion = catchAsync(async (req, res) => {
	await UserService.requestAccountDeletion(
		currentUser(req).id,
		req.body as IRequestAccountDeletionPayload,
	);

	clearAuthCookies(res);

	sendResponse(res, {
		statusCode: httpStatus.ACCEPTED,
		success: true,
		message:
			"Account deletion request submitted. Your account is restricted until an administrator reviews it.",
	});
});

export const UserController = {
	getProfile,
	updateProfile,
	removeProfileImage,
	requestAccountDeletion,
};
