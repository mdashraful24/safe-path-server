import httpStatus from "http-status";
import { currentUser } from "../../middlewares/auth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { DashboardService } from "./dashboard.service";

const getOverview = catchAsync(async (req, res) => {
	const overview = await DashboardService.getOverview(currentUser(req));

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Dashboard overview fetched successfully.",
		data: overview,
	});
});

export const DashboardController = {
	getOverview,
};
