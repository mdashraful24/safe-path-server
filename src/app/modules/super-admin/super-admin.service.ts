import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import {
	AdminChangeRequestStatus,
	AdminChangeRequestType,
	Role,
	UserStatus,
} from "../../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import logger from "../../logger";
import { AppError } from "../../utils/AppError";
import { isAccountUnavailable } from "../../utils/accountLifecycle";
import { createPendingEmailChange } from "../../utils/emailChange";
import {
	sendAdminChangeRequestApprovedEmail,
	sendAdminChangeRequestRejectedEmail,
	sendPasswordChangedEmail,
} from "../../utils/email";
import { getPagination } from "../../utils/pagination";
import type {
	IAdminListQuery,
	IChangeRequestListQuery,
	IUpdateUserRolePayload,
} from "./super-admin.interface";

const listAdmins = async (requesterId: string, query: IAdminListQuery) => {
	const { page, limit, skip } = getPagination(query.page, query.limit);
	const andConditions: Prisma.UserWhereInput[] = [
		{ id: { not: requesterId } },
		{ role: query.role ?? { in: [Role.ADMIN, Role.SUPER_ADMIN] } },
		{ isDeleted: false },
	];

	if (query.status) {
		andConditions.push({ status: query.status });
	}

	if (query.searchTerm) {
		andConditions.push({
			OR: [
				{ name: { contains: query.searchTerm, mode: "insensitive" } },
				{ email: { contains: query.searchTerm, mode: "insensitive" } },
			],
		});
	}

	const where: Prisma.UserWhereInput = { AND: andConditions };
	const orderBy = [
		{ [query.sortBy ?? "createdAt"]: query.sortOrder ?? "desc" },
		{ id: "asc" },
	] as Prisma.UserOrderByWithRelationInput[];

	const [admins, totalAdmins] = await Promise.all([
		prisma.user.findMany({
			where,
			orderBy,
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
		select: {
			id: true,
			role: true,
			status: true,
			isDeleted: true,
			passwordHash: true,
		},
	});

	if (!user || isAccountUnavailable(user)) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found.");
	}

	if (user.status === UserStatus.PENDING_DELETION) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Resolve the pending account deletion request first.",
		);
	}

	if (payload.role !== Role.USER && !user.passwordHash) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"This Google-only account cannot be promoted. The user must have a password before becoming an admin.",
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

const getChangeRequests = async (query: IChangeRequestListQuery) => {
	const { page, limit, skip } = getPagination(query.page, query.limit);
	const andConditions: Prisma.AdminChangeRequestWhereInput[] = [
		{ status: query.status ?? AdminChangeRequestStatus.PENDING },
	];

	if (query.type) {
		andConditions.push({ type: query.type });
	}

	if (query.searchTerm) {
		andConditions.push({
			OR: [
				{
					requester: {
						OR: [
							{
								name: {
									contains: query.searchTerm,
									mode: "insensitive",
								},
							},
							{
								email: {
									contains: query.searchTerm,
									mode: "insensitive",
								},
							},
						],
					},
				},
				{
					targetUser: {
						OR: [
							{
								name: {
									contains: query.searchTerm,
									mode: "insensitive",
								},
							},
							{
								email: {
									contains: query.searchTerm,
									mode: "insensitive",
								},
							},
						],
					},
				},
				{
					requestedEmail: {
						contains: query.searchTerm,
						mode: "insensitive",
					},
				},
				{
					reason: {
						contains: query.searchTerm,
						mode: "insensitive",
					},
				},
			],
		});
	}

	const where: Prisma.AdminChangeRequestWhereInput = {
		AND: andConditions,
	};
	const orderBy = [
		{ [query.sortBy ?? "createdAt"]: query.sortOrder ?? "asc" },
		{ id: "asc" },
	] as Prisma.AdminChangeRequestOrderByWithRelationInput[];

	const [requests, totalChangeRequests] = await Promise.all([
		prisma.adminChangeRequest.findMany({
			where,
			orderBy,
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
		isAccountUnavailable(request.targetUser) ||
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

	const isEmailChange = request.type === AdminChangeRequestType.EMAIL;

	if (isEmailChange) {
		await createPendingEmailChange({
			userId: request.targetUserId,
			email: request.requestedEmail as string,
			name: request.targetUser.name,
		});

		await prisma.adminChangeRequest.update({
			where: { id: request.id },
			data: {
				status: AdminChangeRequestStatus.APPROVED,
				reviewedById: requesterId,
				reviewedAt: new Date(),
				requestedPasswordHash: null,
			},
		});
	} else {
		await prisma.$transaction(async (tx) => {
			await tx.user.update({
				where: { id: request.targetUserId },
				data: {
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
	}

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
				to: request.targetUser.email,
				name: request.requester.name,
				type: request.type,
				pendingVerification: true,
			});
		} catch (error) {
			logger.error("Failed to send admin change approval email:", error);
		}
	}

	return {
		id: request.id,
		type: request.type,
		status: AdminChangeRequestStatus.APPROVED,
		emailVerificationRequired: isEmailChange,
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
