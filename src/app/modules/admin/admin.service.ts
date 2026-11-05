import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import {
	AccountLifecycleEventType,
	AdminChangeRequestType,
	Role,
	UserStatus,
} from "../../../../generated/prisma/enums";
import { deleteCloudinaryImage } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import logger from "../../logger";
import { AppError } from "../../utils/AppError";
import {
	canAdminRestore,
	getAccountLifecycleDates,
	isAccountUnavailable,
} from "../../utils/accountLifecycle";
import {
	sendAccountDeletionApprovedEmail,
	sendAccountDeletionRejectedEmail,
	sendAdminChangeRequestEmail,
} from "../../utils/email";
import { getPagination } from "../../utils/pagination";
import { hashPassword } from "../../utils/password";
import type {
	IAdminChangeRequestPayload,
	IAdminUserListQuery,
	IDeletionRequestListQuery,
	IUpdateUserStatusPayload,
} from "./admin.interface";

const listUsers = async (requesterRole: Role, query: IAdminUserListQuery) => {
	const { page, limit, skip } = getPagination(query.page, query.limit);
	const andConditions: Prisma.UserWhereInput[] = [];

	if (requesterRole === Role.SUPER_ADMIN) {
		if (query.role) {
			andConditions.push({ role: query.role });
		}
	} else {
		andConditions.push({ role: Role.USER });
	}

	if (query.status) {
		andConditions.push({ status: query.status });
	} else {
		andConditions.push({ status: { not: UserStatus.PURGED } });
	}

	if (query.searchTerm) {
		andConditions.push({
			OR: [
				{ name: { contains: query.searchTerm, mode: "insensitive" } },
				{ email: { contains: query.searchTerm, mode: "insensitive" } },
			],
		});
	}

	const where: Prisma.UserWhereInput =
		andConditions.length > 0 ? { AND: andConditions } : {};
	const orderBy = [
		{ [query.sortBy ?? "createdAt"]: query.sortOrder ?? "desc" },
		{ id: "asc" },
	] as Prisma.UserOrderByWithRelationInput[];

	const [users, totalUsers] = await Promise.all([
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
		data: users,
		meta: {
			page,
			limit,
			total: totalUsers,
			totalPages: Math.ceil(totalUsers / limit),
		},
	};
};

const getUserDetails = async (
	requesterRole: Role,
	requesterId: string,
	userId: string,
) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		omit: { passwordHash: true },
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found.");
	}

	if (
		requesterRole !== Role.SUPER_ADMIN &&
		user.id !== requesterId &&
		user.role !== Role.USER
	) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found.");
	}

	return user;
};

const updateUserStatus = async (
	requesterRole: Role,
	requesterId: string,
	userId: string,
	payload: IUpdateUserStatusPayload,
) => {
	if (requesterId === userId) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"You cannot change your own account status.",
		);
	}

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, role: true, status: true, isDeleted: true },
	});

	if (!user || isAccountUnavailable(user)) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found.");
	}

	if (requesterRole !== Role.SUPER_ADMIN && user.role !== Role.USER) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found.");
	}

	if (user.status === UserStatus.PENDING_DELETION) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Resolve the pending account deletion request first.",
		);
	}

	return prisma.user.update({
		where: { id: userId },
		data: {
			status: payload.status,
			tokenVersion: { increment: 1 },
		},
		omit: { passwordHash: true },
	});
};

const getDeletionRequests = async (
	requesterRole: Role,
	query: IDeletionRequestListQuery,
) => {
	const { page, limit, skip } = getPagination(query.page, query.limit);
	const andConditions: Prisma.UserWhereInput[] = [
		{ status: UserStatus.PENDING_DELETION },
	];

	if (requesterRole === Role.SUPER_ADMIN) {
		if (query.role) {
			andConditions.push({ role: query.role });
		}
	} else {
		andConditions.push({ role: Role.USER });
	}

	if (query.searchTerm) {
		andConditions.push({
			OR: [
				{ name: { contains: query.searchTerm, mode: "insensitive" } },
				{ email: { contains: query.searchTerm, mode: "insensitive" } },
			],
		});
	}

	const where: Prisma.UserWhereInput = {
		AND: andConditions,
	};
	const orderBy = [
		{ [query.sortBy ?? "deletionRequestedAt"]: query.sortOrder ?? "asc" },
		{ id: "asc" },
	] as Prisma.UserOrderByWithRelationInput[];

	const [requests, totalDeletionRequests] = await Promise.all([
		prisma.user.findMany({
			where,
			orderBy,
			skip,
			take: limit,
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				imageUrl: true,
				deletionRequestedAt: true,
				deletionRequestReason: true,
				createdAt: true,
			},
		}),
		prisma.user.count({ where }),
	]);

	return {
		data: requests,
		meta: {
			page,
			limit,
			total: totalDeletionRequests,
			totalPages: Math.ceil(totalDeletionRequests / limit),
		},
	};
};

const approveAccountDeletion = async (
	requesterRole: Role,
	requesterId: string,
	userId: string,
) => {
	const user = await prisma.user.findFirst({
		where: {
			id: userId,
			status: UserStatus.PENDING_DELETION,
			...(requesterRole === Role.SUPER_ADMIN ? {} : { role: Role.USER }),
		},
	});

	if (!user) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Pending account deletion request not found.",
		);
	}

	const approvedAt = new Date();
	const lifecycleDates = getAccountLifecycleDates(approvedAt);

	await prisma.$transaction([
		prisma.user.update({
			where: { id: user.id },
			data: {
				status: UserStatus.DELETED,
				isDeleted: true,
				deletedAt: approvedAt,
				deletionApprovedAt: approvedAt,
				restoreDeadline: lifecycleDates.restoreDeadline,
				purgeAfter: lifecycleDates.purgeAfter,
				imageUrl: null,
				imagePublicId: null,
				tokenVersion: { increment: 1 },
			},
		}),
		prisma.session.deleteMany({ where: { userId: user.id } }),
		prisma.accountLifecycleEvent.create({
			data: {
				userId: user.id,
				actorId: requesterId,
				type: AccountLifecycleEventType.DELETION_APPROVED,
				metadata: {
					method: "ADMIN",
					restoreDeadline: lifecycleDates.restoreDeadline.toISOString(),
					purgeAfter: lifecycleDates.purgeAfter.toISOString(),
				},
			},
		}),
	]);

	if (user.imagePublicId) {
		await deleteCloudinaryImage(user.imagePublicId);
	}

	try {
		await sendAccountDeletionApprovedEmail({
			to: user.email,
			name: user.name,
			restoreDeadline: lifecycleDates.restoreDeadline,
		});
	} catch (error) {
		logger.error("Failed to send account deletion confirmation email:", error);
	}

	return { id: user.id, email: user.email };
};

const rejectAccountDeletion = async (
	requesterRole: Role,
	requesterId: string,
	userId: string,
	reason: string,
) => {
	const user = await prisma.user.findFirst({
		where: {
			id: userId,
			status: UserStatus.PENDING_DELETION,
			...(requesterRole === Role.SUPER_ADMIN ? {} : { role: Role.USER }),
		},
	});

	if (!user) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Pending account deletion request not found.",
		);
	}

	const rejectedAt = new Date();

	await prisma.$transaction([
		prisma.user.update({
			where: { id: user.id },
			data: {
				status: UserStatus.ACTIVE,
				deletionRequestedAt: null,
				deletionRequestReason: null,
				deletionRejectionReason: reason,
				deletionRejectedAt: rejectedAt,
			},
		}),
		prisma.accountLifecycleEvent.create({
			data: {
				userId: user.id,
				actorId: requesterId,
				type: AccountLifecycleEventType.DELETION_REJECTED,
				reason,
				metadata: { method: "ADMIN" },
			},
		}),
	]);

	try {
		await sendAccountDeletionRejectedEmail({
			to: user.email,
			name: user.name,
			reason,
		});
	} catch (error) {
		logger.error("Failed to send account deletion rejection email:", error);
	}

	return { id: user.id, email: user.email };
};

const restoreDeletedAccount = async (
	requesterRole: Role,
	requesterId: string,
	userId: string,
	reason: string,
) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			email: true,
			role: true,
			status: true,
			isDeleted: true,
			deletedAt: true,
			restoreDeadline: true,
			purgeAfter: true,
		},
	});

	if (
		!user ||
		(requesterRole !== Role.SUPER_ADMIN && user.role !== Role.USER)
	) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found.");
	}

	if (user.status === UserStatus.PURGED) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Purged accounts cannot be restored.",
		);
	}

	if (!canAdminRestore(user)) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			user.status === UserStatus.DELETED
				? "The account restoration window has expired."
				: "Account is not deleted and cannot be restored.",
		);
	}

	const restoredAt = new Date();

	const [restoredUser] = await prisma.$transaction([
		prisma.user.update({
			where: { id: user.id },
			data: {
				status: UserStatus.ACTIVE,
				isDeleted: false,
				deletedAt: null,
				deletionRequestedAt: null,
				deletionRequestReason: null,
				deletionRejectionReason: null,
				deletionRejectedAt: null,
				deletionApprovedAt: null,
				restoreDeadline: null,
				purgeAfter: null,
				purgedAt: null,
				restoredAt,
				tokenVersion: { increment: 1 },
			},
			omit: { passwordHash: true },
		}),
		prisma.session.deleteMany({ where: { userId: user.id } }),
		prisma.accountLifecycleEvent.create({
			data: {
				userId: user.id,
				actorId: requesterId,
				type: AccountLifecycleEventType.RESTORED,
				reason,
				metadata: { method: "ADMIN" },
			},
		}),
	]);

	return restoredUser;
};

const createChangeRequest = async (
	requesterId: string,
	requesterRole: Role,
	payload: IAdminChangeRequestPayload,
) => {
	if (requesterRole !== Role.ADMIN) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Only admins can submit email or password change requests.",
		);
	}

	const requester = await prisma.user.findUnique({
		where: { id: requesterId },
		select: {
			id: true,
			name: true,
			email: true,
			status: true,
			isDeleted: true,
		},
	});

	if (!requester || isAccountUnavailable(requester)) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found.");
	}

	if (requester.status === UserStatus.PENDING_DELETION) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Resolve the pending account deletion request first.",
		);
	}

	let requestedEmail: string | null = null;
	let requestedPasswordHash: string | null = null;

	if (payload.type === "EMAIL") {
		requestedEmail = payload.requestedEmail.trim().toLowerCase();

		const emailOwner = await prisma.user.findUnique({
			where: { email: requestedEmail },
			select: { id: true },
		});

		if (emailOwner && emailOwner.id !== requester.id) {
			throw new AppError(
				httpStatus.CONFLICT,
				"User with this email already exists.",
			);
		}
	} else {
		requestedPasswordHash = await hashPassword(payload.newPassword);
	}

	const request = await prisma.adminChangeRequest.create({
		data: {
			requesterId,
			targetUserId: requester.id,
			type:
				payload.type === "EMAIL"
					? AdminChangeRequestType.EMAIL
					: AdminChangeRequestType.PASSWORD,
			reason: payload.reason,
			requestedEmail,
			requestedPasswordHash,
		},
		select: {
			id: true,
			type: true,
			targetUserId: true,
			status: true,
			createdAt: true,
		},
	});

	const superAdmins = await prisma.user.findMany({
		where: {
			role: Role.SUPER_ADMIN,
			status: UserStatus.ACTIVE,
			isDeleted: false,
		},
		select: { name: true, email: true },
	});

	for (const superAdmin of superAdmins) {
		try {
			await sendAdminChangeRequestEmail({
				to: superAdmin.email,
				name: superAdmin.name,
				requesterName: requester.name,
				requesterEmail: requester.email,
				targetName: requester.name,
				targetEmail: requester.email,
				type: payload.type,
				reason: payload.reason,
				requestedEmail,
			});
		} catch (error) {
			logger.error("Failed to send admin change request email:", error);
		}
	}

	return request;
};

export const AdminService = {
	listUsers,
	getUserDetails,
	updateUserStatus,
	getDeletionRequests,
	approveAccountDeletion,
	rejectAccountDeletion,
	restoreDeletedAccount,
	createChangeRequest,
};
