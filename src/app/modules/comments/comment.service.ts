import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import { IncidentStatus } from "../../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { getPagination } from "../../utils/pagination";
import type {
	ICommentListQuery,
	ICreateCommentPayload,
	IUpdateCommentPayload,
} from "./comment.interface";

const commentSelect = {
	id: true,
	content: true,
	incidentId: true,
	editedAt: true,
	createdAt: true,
	updatedAt: true,
	author: {
		select: {
			id: true,
			name: true,
			imageUrl: true,
		},
	},
} as const satisfies Prisma.CommentSelect;

const ensureApprovedIncident = async (incidentId: string) => {
	const incident = await prisma.incident.findFirst({
		where: {
			id: incidentId,
			status: IncidentStatus.APPROVED,
		},
		select: { id: true },
	});

	if (!incident) {
		throw new AppError(httpStatus.NOT_FOUND, "Incident not found.");
	}

	return incident;
};

const listComments = async (incidentId: string, query: ICommentListQuery) => {
	await ensureApprovedIncident(incidentId);

	const { page, limit, skip } = getPagination(query.page, query.limit, 20);
	const sortOrder = query.sortOrder ?? "asc";
	const where = { incidentId };

	const [comments, totalComments] = await Promise.all([
		prisma.comment.findMany({
			where,
			select: commentSelect,
			orderBy: [{ createdAt: sortOrder }, { id: sortOrder }],
			skip,
			take: limit,
		}),
		prisma.comment.count({ where }),
	]);

	return {
		data: comments,
		meta: {
			page,
			limit,
			total: totalComments,
			totalPages: Math.ceil(totalComments / limit),
		},
	};
};

const createComment = async (
	authorId: string,
	incidentId: string,
	payload: ICreateCommentPayload,
) => {
	await ensureApprovedIncident(incidentId);

	return prisma.comment.create({
		data: {
			content: payload.content,
			incidentId,
			authorId,
		},
		select: commentSelect,
	});
};

const updateMyComment = async (
	authorId: string,
	incidentId: string,
	commentId: string,
	payload: IUpdateCommentPayload,
) => {
	const comment = await prisma.comment.findFirst({
		where: {
			id: commentId,
			incidentId,
			authorId,
		},
		select: { id: true },
	});

	if (!comment) {
		throw new AppError(httpStatus.NOT_FOUND, "Comment not found.");
	}

	return prisma.comment.update({
		where: { id: comment.id },
		data: {
			content: payload.content,
			editedAt: new Date(),
		},
		select: commentSelect,
	});
};

const deleteMyComment = async (
	authorId: string,
	incidentId: string,
	commentId: string,
) => {
	const comment = await prisma.comment.findFirst({
		where: {
			id: commentId,
			incidentId,
			authorId,
		},
		select: { id: true },
	});

	if (!comment) {
		throw new AppError(httpStatus.NOT_FOUND, "Comment not found.");
	}

	await prisma.comment.delete({ where: { id: comment.id } });

	return { id: comment.id };
};

const deleteCommentForAdmin = async (incidentId: string, commentId: string) => {
	const comment = await prisma.comment.findFirst({
		where: {
			id: commentId,
			incidentId,
		},
		select: { id: true },
	});

	if (!comment) {
		throw new AppError(httpStatus.NOT_FOUND, "Comment not found.");
	}

	await prisma.comment.delete({ where: { id: comment.id } });

	return { id: comment.id };
};

export const CommentService = {
	listComments,
	createComment,
	updateMyComment,
	deleteMyComment,
	deleteCommentForAdmin,
};
