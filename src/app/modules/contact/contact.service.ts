import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import { ContactMessageStatus } from "../../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import logger from "../../logger";
import { AppError } from "../../utils/AppError";
import {
	sendContactAcknowledgementEmail,
	sendContactNotificationEmail,
	sendContactReplyEmail,
} from "../../utils/email";
import { getPagination } from "../../utils/pagination";
import type {
	ContactTopic,
	IContactListQuery,
	ICreateContactPayload,
	IReplyContactPayload,
} from "./contact.interface";

const contactMessageSelect = {
	id: true,
	name: true,
	email: true,
	topic: true,
	subject: true,
	message: true,
	status: true,
	reply: true,
	repliedAt: true,
	createdAt: true,
	updatedAt: true,
	repliedBy: {
		select: {
			id: true,
			name: true,
			role: true,
		},
	},
} as const satisfies Prisma.ContactMessageSelect;

const topicLabels: Record<ContactTopic, string> = {
	GENERAL: "General question",
	REPORT_ISSUE: "Report an incident issue",
	ACCOUNT: "Account help",
	SAFETY: "Safety concern",
	PARTNERSHIP: "Partnership or press",
	OTHER: "Other",
};

type ContactMessage = {
	name: string;
	email: string;
	topic: ContactTopic;
	subject: string;
	message: string;
};

const notifyContactTeam = async (contactMessage: ContactMessage) => {
	try {
		await Promise.all([
			sendContactAcknowledgementEmail({
				to: contactMessage.email,
				name: contactMessage.name,
				subject: contactMessage.subject,
			}),
			sendContactNotificationEmail({
				name: contactMessage.name,
				email: contactMessage.email,
				topic: topicLabels[contactMessage.topic],
				subject: contactMessage.subject,
				message: contactMessage.message,
			}),
		]);
	} catch (error) {
		logger.error("Failed to send contact form emails.", error);
	}
};

const createContactMessage = async (payload: ICreateContactPayload) => {
	const contactMessage = await prisma.contactMessage.create({
		data: {
			name: payload.name,
			email: payload.email,
			topic: payload.topic,
			subject: payload.subject,
			message: payload.message,
		},
		select: contactMessageSelect,
	});

	void notifyContactTeam(contactMessage);

	return contactMessage;
};

const listContactMessages = async (query: IContactListQuery) => {
	const { page, limit, skip } = getPagination(query.page, query.limit, 20);
	const andConditions: Prisma.ContactMessageWhereInput[] = [];

	if (query.status) {
		andConditions.push({ status: query.status });
	}

	if (query.topic) {
		andConditions.push({ topic: query.topic });
	}

	if (query.searchTerm) {
		andConditions.push({
			OR: [
				{ name: { contains: query.searchTerm, mode: "insensitive" } },
				{ email: { contains: query.searchTerm, mode: "insensitive" } },
				{ subject: { contains: query.searchTerm, mode: "insensitive" } },
				{ message: { contains: query.searchTerm, mode: "insensitive" } },
			],
		});
	}

	const where: Prisma.ContactMessageWhereInput =
		andConditions.length > 0 ? { AND: andConditions } : {};
	const orderBy = [
		{ createdAt: query.sortOrder ?? "desc" },
		{ id: "asc" },
	] as Prisma.ContactMessageOrderByWithRelationInput[];

	const [contactMessages, totalContactMessages] = await Promise.all([
		prisma.contactMessage.findMany({
			where,
			orderBy,
			skip,
			take: limit,
			select: contactMessageSelect,
		}),
		prisma.contactMessage.count({ where }),
	]);

	return {
		data: contactMessages,
		meta: {
			page,
			limit,
			total: totalContactMessages,
			totalPages: Math.ceil(totalContactMessages / limit),
		},
	};
};

const getContactMessage = async (contactId: string) => {
	const contactMessage = await prisma.contactMessage.findUnique({
		where: { id: contactId },
		select: contactMessageSelect,
	});

	if (!contactMessage) {
		throw new AppError(httpStatus.NOT_FOUND, "Contact message not found.");
	}

	return contactMessage;
};

const replyToContactMessage = async (
	repliedById: string,
	contactId: string,
	payload: IReplyContactPayload,
) => {
	const existing = await prisma.contactMessage.findUnique({
		where: { id: contactId },
		select: { id: true },
	});

	if (!existing) {
		throw new AppError(httpStatus.NOT_FOUND, "Contact message not found.");
	}

	const contactMessage = await prisma.contactMessage.update({
		where: { id: contactId },
		data: {
			reply: payload.message,
			repliedAt: new Date(),
			repliedById,
			status: ContactMessageStatus.RESOLVED,
		},
		select: contactMessageSelect,
	});

	let emailSent = true;

	try {
		await sendContactReplyEmail({
			to: contactMessage.email,
			name: contactMessage.name,
			subject: contactMessage.subject,
			reply: payload.message,
			repliedBy: contactMessage.repliedBy?.name ?? "SafePath Support",
		});
	} catch (error) {
		emailSent = false;
		logger.error("Failed to send contact reply email.", error);
	}

	return { contactMessage, emailSent };
};

export const ContactService = {
	createContactMessage,
	listContactMessages,
	getContactMessage,
	replyToContactMessage,
};
