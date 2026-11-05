import httpStatus from "http-status";
import {
	AdminChangeRequestStatus,
	AdminChangeRequestType,
	Role,
	UserStatus,
} from "../../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import logger from "../../logger";
import { AppError } from "../../utils/AppError";
import {
	sendAdminChangeRequestApprovedEmail,
	sendAdminChangeRequestRejectedEmail,
	sendPasswordChangedEmail,
} from "../../utils/email";
import { getPagination } from "../../utils/pagination";
import type { IUpdateUserRolePayload } from "./super-admin.interface";

const listAdmins = async (
	requesterId: string,
	pageValue: unknown,
	limitValue: unknown,
) => {
	const where = {
		id: { not: requesterId },
		role: { in: [Role.ADMIN, Role.SUPER_ADMIN] },
		isDeleted: false,
	};
	const { page, limit, skip } = getPagination(pageValue, limitValue);

	const [admins, totalAdmins] = await Promise.all([
		prisma.user.findMany({
			where,
			orderBy: { createdAt: "desc" },
			skip,
			take: limit,
			omit: { passwordHash: true },
		}),
		prisma.user.count({ where }),
	]);

	return {
		data: admins,
		meta: {
			page,
			limit,
			total: totalAdmins,
			totalPages: Math.ceil(totalAdmins / limit),
		},
	};
};

const updateUserRole = async (
	requesterId: string,
	userId: string,
	payload: IUpdateUserRolePayload,
) => {
	if (requesterId === userId) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"You cannot change your own role.",
		);
	}

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, role: true, status: true, isDeleted: true },
	});

	if (!user || user.isDeleted || user.status === UserStatus.DELETED) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found.");
	}

	if (user.status === UserStatus.PENDING_DELETION) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Resolve the pending account deletion request first.",
		);
	}

	if (user.role === Role.SUPER_ADMIN && payload.role !== Role.SUPER_ADMIN) {
		const superAdminCount = await prisma.user.count({
			where: { role: Role.SUPER_ADMIN, isDeleted: false },
		});

		if (superAdminCount <= 1) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"At least one super admin must remain.",
			);
		}
	}

	return prisma.user.update({
		where: { id: user.id },
		data: {
			role: payload.role,
			tokenVersion: { increment: 1 },
		},
		omit: { passwordHash: true },
	});
};

const getChangeRequests = async (pageValue: unknown, limitValue: unknown) => {
	const where = { status: AdminChangeRequestStatus.PENDING };
	const { page, limit, skip } = getPagination(pageValue, limitValue);

	const [requests, totalChangeRequests] = await Promise.all([
		prisma.adminChangeRequest.findMany({
			where,
			orderBy: { createdAt: "asc" },
			skip,
			take: limit,
			select: {
				id: true,
				type: true,
				reason: true,
				requestedEmail: true,
				status: true,
				createdAt: true,
				requester: { select: { id: true, name: true, email: true } },
				targetUser: {
					select: { id: true, name: true, email: true, role: true },
				},
			},
		}),
		prisma.adminChangeRequest.count({ where }),
	]);

	return {
		data: requests,
		meta: {
			page,
			limit,
			total: totalChangeRequests,
			totalPages: Math.ceil(totalChangeRequests / limit),
		},
	};
};

const approveChangeRequest = async (requesterId: string, requestId: string) => {
	const request = await prisma.adminChangeRequest.findUnique({
		where: { id: requestId },
		include: {
			requester: { select: { name: true, email: true } },
			targetUser: {
				select: {
					name: true,
					email: true,
					status: true,
					isDeleted: true,
				},
			},
		},
	});

	if (
		!request ||
		request.status !== AdminChangeRequestStatus.PENDING ||
		!request.targetUser ||
		request.targetUser.isDeleted ||
		request.targetUser.status === UserStatus.DELETED ||
		request.targetUser.status === UserStatus.PENDING_DELETION
	) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Pending change request not found.",
		);
	}

	if (request.type === AdminChangeRequestType.EMAIL) {
		if (!request.requestedEmail) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"The requested email is missing.",
			);
		}

		const emailOwner = await prisma.user.findUnique({
			where: { email: request.requestedEmail },
			select: { id: true },
		});

		if (emailOwner && emailOwner.id !== request.targetUserId) {
			throw new AppError(
				httpStatus.CONFLICT,
				"User with this email already exists.",
			);
		}
	}

	if (
		request.type === AdminChangeRequestType.PASSWORD &&
		!request.requestedPasswordHash
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"The requested password is missing.",
		);
	}

	await prisma.$transaction(async (tx) => {
		await tx.user.update({
			where: { id: request.targetUserId },
			data:
				request.type === AdminChangeRequestType.EMAIL
					? {
							email: request.requestedEmail as string,
							emailVerified: true,
							emailVerifiedAt: new Date(),
							tokenVersion: { increment: 1 },
						}
					: {
							passwordHash: request.requestedPasswordHash as string,
							tokenVersion: { increment: 1 },
						},
		});

		await tx.adminChangeRequest.update({
			where: { id: request.id },
			data: {
				status: AdminChangeRequestStatus.APPROVED,
				reviewedById: requesterId,
				reviewedAt: new Date(),
				requestedPasswordHash: null,
			},
		});
	});

	if (request.type === AdminChangeRequestType.PASSWORD) {
		try {
			await sendPasswordChangedEmail({
				to: request.targetUser.email,
				name: request.targetUser.name,
			});
		} catch (error) {
			logger.error("Failed to send password changed email:", error);
		}
	} else {
		try {
			await sendAdminChangeRequestApprovedEmail({
				to: request.requestedEmail as string,
				name: request.requester.name,
				type: request.type,
			});
		} catch (error) {
			logger.error("Failed to send admin change approval email:", error);
		}
	}

	return {
		id: request.id,
		type: request.type,
		status: AdminChangeRequestStatus.APPROVED,
	};
};

const rejectChangeRequest = async (
	requesterId: string,
	requestId: string,
	reason: string,
) => {
	const request = await prisma.adminChangeRequest.findUnique({
		where: { id: requestId },
		include: {
			requester: { select: { name: true, email: true } },
		},
	});

	if (!request || request.status !== AdminChangeRequestStatus.PENDING) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Pending change request not found.",
		);
	}

	await prisma.adminChangeRequest.update({
		where: { id: request.id },
		data: {
			status: AdminChangeRequestStatus.REJECTED,
			reviewedById: requesterId,
			reviewNote: reason,
			reviewedAt: new Date(),
			requestedPasswordHash: null,
		},
	});

	try {
		await sendAdminChangeRequestRejectedEmail({
			to: request.requester.email,
			name: request.requester.name,
			type: request.type,
			reason,
		});
	} catch (error) {
		logger.error("Failed to send admin change rejection email:", error);
	}

	return {
		id: request.id,
		type: request.type,
		status: AdminChangeRequestStatus.REJECTED,
	};
};

export const SuperAdminService = {
	listAdmins,
	updateUserRole,
	getChangeRequests,
	approveChangeRequest,
	rejectChangeRequest,
};
