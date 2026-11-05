import httpStatus from "http-status";
import {
	AdminChangeRequestType,
	Role,
	UserStatus,
} from "../../../../generated/prisma/enums";
import { deleteCloudinaryImage } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import logger from "../../logger";
import { AppError } from "../../utils/AppError";
import {
	sendAccountDeletionApprovedEmail,
	sendAccountDeletionRejectedEmail,
	sendAdminChangeRequestEmail,
} from "../../utils/email";
import { getPagination } from "../../utils/pagination";
import { hashPassword } from "../../utils/password";
import type {
	IAdminChangeRequestPayload,
	IUpdateUserStatusPayload,
} from "./admin.interface";

const listUsers = async (
	requesterRole: Role,
	pageValue: unknown,
	limitValue: unknown,
) => {
	const where = requesterRole === Role.SUPER_ADMIN ? {} : { role: Role.USER };
	const { page, limit, skip } = getPagination(pageValue, limitValue);

	const [users, totalUsers] = await Promise.all([
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

	if (!user || user.isDeleted || user.status === UserStatus.DELETED) {
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
	pageValue: unknown,
	limitValue: unknown,
) => {
	const where = {
		status: UserStatus.PENDING_DELETION,
		...(requesterRole === Role.SUPER_ADMIN ? {} : { role: Role.USER }),
	};
	const { page, limit, skip } = getPagination(pageValue, limitValue);

	const [requests, totalDeletionRequests] = await Promise.all([
		prisma.user.findMany({
			where,
			orderBy: { deletionRequestedAt: "asc" },
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

const approveAccountDeletion = async (requesterRole: Role, userId: string) => {
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

	await prisma.$transaction([
		prisma.user.update({
			where: { id: user.id },
			data: {
				status: UserStatus.DELETED,
				isDeleted: true,
				deletedAt: new Date(),
				imageUrl: null,
				imagePublicId: null,
				tokenVersion: { increment: 1 },
			},
		}),
		prisma.session.deleteMany({ where: { userId: user.id } }),
	]);

	if (user.imagePublicId) {
		await deleteCloudinaryImage(user.imagePublicId);
	}

	try {
		await sendAccountDeletionApprovedEmail({
			to: user.email,
			name: user.name,
		});
	} catch (error) {
		logger.error("Failed to send account deletion confirmation email:", error);
	}

	return { id: user.id, email: user.email };
};

const rejectAccountDeletion = async (
	requesterRole: Role,
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

	await prisma.user.update({
		where: { id: user.id },
		data: {
			status: UserStatus.ACTIVE,
			deletionRequestedAt: null,
			deletionRequestReason: null,
			deletionRejectionReason: reason,
			deletionRejectedAt: new Date(),
		},
	});

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

	if (
		!requester ||
		requester.isDeleted ||
		requester.status === UserStatus.DELETED
	) {
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
	createChangeRequest,
};
