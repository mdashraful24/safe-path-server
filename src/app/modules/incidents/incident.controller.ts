import httpStatus from "http-status";
import { currentUser } from "../../middlewares/auth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type {
	ICreateIncidentPayload,
	IReviewIncidentPayload,
	IUpdateIncidentPayload,
} from "./incident.interface";
import { IncidentService } from "./incident.service";
import { parseIncidentListQuery } from "./incident.validation";

const createIncident = catchAsync(async (req, res) => {
	const incident = await IncidentService.createIncident(
		currentUser(req).id,
		req.body as ICreateIncidentPayload,
		req.file,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Incident reported successfully and is pending review.",
		data: incident,
	});
});

const listPublicIncidents = catchAsync(async (req, res) => {
	const result = await IncidentService.listPublicIncidents(
		parseIncidentListQuery(req.query),
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Approved incidents fetched successfully.",
		data: result.data,
		meta: result.meta,
	});
});

const getPublicIncident = catchAsync(async (req, res) => {
	const incident = await IncidentService.getPublicIncident(
		String(req.params.incidentId),
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Incident fetched successfully.",
		data: incident,
	});
});

const listMyIncidents = catchAsync(async (req, res) => {
	const result = await IncidentService.listMyIncidents(
		currentUser(req).id,
		parseIncidentListQuery(req.query),
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Your incidents fetched successfully.",
		data: result.data,
		meta: result.meta,
	});
});

const getMyIncident = catchAsync(async (req, res) => {
	const incident = await IncidentService.getMyIncident(
		currentUser(req).id,
		String(req.params.incidentId),
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Incident fetched successfully.",
		data: incident,
	});
});

const updateMyIncident = catchAsync(async (req, res) => {
	const incident = await IncidentService.updateMyIncident(
		currentUser(req).id,
		String(req.params.incidentId),
		req.body as IUpdateIncidentPayload,
		req.file,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Incident updated successfully.",
		data: incident,
	});
});

const deleteMyIncident = catchAsync(async (req, res) => {
	await IncidentService.deleteMyIncident(
		currentUser(req).id,
		String(req.params.incidentId),
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Incident deleted successfully.",
		data: null,
	});
});

const listIncidentsForAdmin = catchAsync(async (req, res) => {
	const result = await IncidentService.listIncidentsForAdmin(
		parseIncidentListQuery(req.query),
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Incidents fetched successfully.",
		data: result.data,
		meta: result.meta,
	});
});

const getIncidentForAdmin = catchAsync(async (req, res) => {
	const incident = await IncidentService.getIncidentForAdmin(
		String(req.params.incidentId),
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Incident details fetched successfully.",
		data: incident,
	});
});

const updateIncidentForAdmin = catchAsync(async (req, res) => {
	const incident = await IncidentService.updateIncidentForAdmin(
		currentUser(req).id,
		String(req.params.incidentId),
		req.body as IUpdateIncidentPayload,
		req.file,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Incident updated successfully.",
		data: incident,
	});
});

const deleteIncidentForAdmin = catchAsync(async (req, res) => {
	const result = await IncidentService.deleteIncidentForAdmin(
		String(req.params.incidentId),
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Incident deleted successfully.",
		data: result,
	});
});

const reviewIncident = catchAsync(async (req, res) => {
	const incident = await IncidentService.reviewIncident(
		currentUser(req).id,
		String(req.params.incidentId),
		req.body as IReviewIncidentPayload,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: `Incident ${incident.status.toLowerCase()} successfully.`,
		data: incident,
	});
});

export const IncidentController = {
	createIncident,
	listPublicIncidents,
	getPublicIncident,
	listMyIncidents,
	getMyIncident,
	updateMyIncident,
	deleteMyIncident,
	listIncidentsForAdmin,
	getIncidentForAdmin,
	updateIncidentForAdmin,
	deleteIncidentForAdmin,
	reviewIncident,
};
