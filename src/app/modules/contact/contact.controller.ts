import httpStatus from "http-status";
import { currentUser } from "../../middlewares/auth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type {
	ICreateContactPayload,
	IReplyContactPayload,
} from "./contact.interface";
import { ContactService } from "./contact.service";
import { parseContactListQuery } from "./contact.validation";

const createContactMessage = catchAsync(async (req, res) => {
	const contactMessage = await ContactService.createContactMessage(
		req.body as ICreateContactPayload,
	);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message:
			"Thanks for reaching out. Our team will get back to you within 1-2 business days.",
		data: {
			id: contactMessage.id,
			createdAt: contactMessage.createdAt,
		},
	});
});

const listContactMessages = catchAsync(async (req, res) => {
	const result = await ContactService.listContactMessages(
		parseContactListQuery(req.query),
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Contact messages fetched successfully.",
		data: result.data,
		meta: result.meta,
	});
});

const getContactMessage = catchAsync(async (req, res) => {
	const contactMessage = await ContactService.getContactMessage(
		String(req.params.contactId),
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Contact message fetched successfully.",
		data: contactMessage,
	});
});

const replyToContactMessage = catchAsync(async (req, res) => {
	const result = await ContactService.replyToContactMessage(
		currentUser(req).id,
		String(req.params.contactId),
		req.body as IReplyContactPayload,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: result.emailSent
			? "Reply sent successfully."
			: "Reply saved, but the email could not be sent.",
		data: {
			...result.contactMessage,
			emailSent: result.emailSent,
		},
	});
});

export const ContactController = {
	createContactMessage,
	listContactMessages,
	getContactMessage,
	replyToContactMessage,
};
