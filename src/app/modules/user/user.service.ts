import httpStatus from "http-status";
import {
	AccountLifecycleEventType,
	Role,
	UserStatus,
} from "../../../../generated/prisma/enums";
import { cloudinary, deleteCloudinaryImage } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import logger from "../../logger";
import { AppError } from "../../utils/AppError";
import { isAccountUnavailable } from "../../utils/accountLifecycle";
import {
	createPendingEmailChange,
	deletePendingEmailChange,
	getPendingEmailChange,
} from "../../utils/emailChange";
import { sendEmailChangedEmail } from "../../utils/email";
import { hashPassword, verifyPassword } from "../../utils/password";
import type {
	IRequestAccountDeletionPayload,
	IUpdateProfilePayload,
	IVerifyEmailChangePayload,
} from "./user.interface";

const uploadProfileImage = (file: Express.Multer.File) =>
	new Promise<{ imageUrl: string; imagePublicId: string }>(
		(resolve, reject) => {
			const stream = cloudinary.uploader.upload_stream(
				{ folder: "safepath/users", resource_type: "image" },
				(error, result) => {
					if (error || !result) {
						reject(
							new AppError(
								httpStatus.INTERNAL_SERVER_ERROR,
								"Failed to upload profile picture.",
							),
						);
						return;
					}

					resolve({
						imageUrl: result.secure_url,
						imagePublicId: result.public_id,
					});
				},
			);

			stream.end(file.buffer);
		},
	);

const getProfile = async (userId: string) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		omit: { passwordHash: true },
	});

	if (!user || isAccountUnavailable(user)) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found.");
	}

	return user;
};

const updateProfile = async (
	userId: string,
	payload: IUpdateProfilePayload,
	file?: Express.Multer.File,
) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			email: true,
			passwordHash: true,
			role: true,
			imagePublicId: true,
		},
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found.");
	}

	const data: {
		name?: string;
		passwordHash?: string;
		imageUrl?: string;
		imagePublicId?: string;
	} = {};
	let emailChange: {
		email: string;
		expiresIn: number;
		expiresAt: Date;
	} | null = null;

	if (payload.name) {
		data.name = payload.name;
	}

	const updatesCredentials = Boolean(payload.email || payload.newPassword);

	if (updatesCredentials) {
		if (user.role !== Role.USER && user.role !== Role.SUPER_ADMIN) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Admins must submit an email or password change request to a super admin.",
			);
		}

		if (!user.passwordHash) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"This account uses Google sign-in and cannot add email/password credentials.",
			);
		}

		if (!payload.currentPassword) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Current password is required to change your email or password.",
			);
		}

		const isPasswordMatched = await verifyPassword(
			payload.currentPassword,
			user.passwordHash,
		);

		if (!isPasswordMatched) {
			throw new AppError(
				httpStatus.UNAUTHORIZED,
				"Current password is incorrect.",
			);
		}
	}

	if (payload.email) {
		const email = payload.email.trim().toLowerCase();

		if (email !== user.email) {
			const emailOwner = await prisma.user.findUnique({
				where: { email },
				select: { id: true },
			});

			if (emailOwner) {
				throw new AppError(
					httpStatus.CONFLICT,
					"User with this email already exists.",
				);
			}

			emailChange = await createPendingEmailChange({
				userId,
				email,
				name: user.name,
			});
		}
	}

	if (payload.newPassword) {
		data.passwordHash = await hashPassword(payload.newPassword);
	}

	const uploadedImage = file ? await uploadProfileImage(file) : null;

	if (uploadedImage) {
		data.imageUrl = uploadedImage.imageUrl;
		data.imagePublicId = uploadedImage.imagePublicId;
	}

	if (Object.keys(data).length === 0 && !emailChange) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Provide a name, email, password, or profile picture to update.",
		);
	}

	try {
		const updated =
			Object.keys(data).length > 0
				? await prisma.user.update({
						where: { id: userId },
						data,
						omit: { passwordHash: true },
					})
				: await prisma.user.findUniqueOrThrow({
						where: { id: userId },
						omit: { passwordHash: true },
					});

		if (uploadedImage && user.imagePublicId) {
			await deleteCloudinaryImage(user.imagePublicId);
		}

		return { user: updated, emailChange };
	} catch (error) {
		if (uploadedImage) {
			await deleteCloudinaryImage(uploadedImage.imagePublicId);
		}
		throw error;
	}
};

const verifyEmailChange = async (
	userId: string,
	payload: IVerifyEmailChangePayload,
) => {
	const pendingEmailChange = await getPendingEmailChange(userId);

	if (!pendingEmailChange || pendingEmailChange.otp !== payload.otp) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Verification code is expired or invalid.",
		);
	}

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			name: true,
			email: true,
			status: true,
			isDeleted: true,
		},
	});

	if (!user || isAccountUnavailable(user)) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found.");
	}

	if (user.status !== UserStatus.ACTIVE) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Only active accounts can change their email address.",
		);
	}

	const emailOwner = await prisma.user.findUnique({
		where: { email: pendingEmailChange.email },
		select: { id: true },
	});

	if (emailOwner && emailOwner.id !== user.id) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User with this email already exists.",
		);
	}

	const updated = await prisma.user.update({
		where: { id: userId },
		data: {
			email: pendingEmailChange.email,
			emailVerified: true,
			emailVerifiedAt: new Date(),
			tokenVersion: { increment: 1 },
		},
		omit: { passwordHash: true },
	});

	await deletePendingEmailChange(userId);

	try {
		await sendEmailChangedEmail({
			to: user.email,
			name: user.name,
			newEmail: pendingEmailChange.email,
		});
	} catch (error) {
		logger.error("Failed to send email changed notification:", error);
	}

	return updated;
};

const removeProfileImage = async (userId: string) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, imagePublicId: true },
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found.");
	}

	if (!user.imagePublicId) {
		throw new AppError(httpStatus.BAD_REQUEST, "No profile picture to remove.");
	}

	const updated = await prisma.user.update({
		where: { id: userId },
		data: { imageUrl: null, imagePublicId: null },
		omit: { passwordHash: true },
	});

	await deleteCloudinaryImage(user.imagePublicId);

	return updated;
};

const requestAccountDeletion = async (
	userId: string,
	payload: IRequestAccountDeletionPayload,
) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, status: true, isDeleted: true },
	});

	if (!user || isAccountUnavailable(user)) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found.");
	}

	if (user.status === UserStatus.PENDING_DELETION) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Your account deletion request is already pending.",
		);
	}

	if (user.status !== UserStatus.ACTIVE) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Only active accounts can request deletion.",
		);
	}

	const reason = payload.reason?.trim() || null;

	await prisma.$transaction([
		prisma.user.update({
			where: { id: userId },
			data: {
				status: UserStatus.PENDING_DELETION,
				deletionRequestedAt: new Date(),
				deletionRequestReason: reason,
				tokenVersion: { increment: 1 },
			},
		}),
		prisma.accountLifecycleEvent.create({
			data: {
				userId,
				type: AccountLifecycleEventType.DELETION_REQUESTED,
				reason,
				metadata: { method: "SELF" },
			},
		}),
	]);
};

export const UserService = {
	getProfile,
	updateProfile,
	verifyEmailChange,
	removeProfileImage,
	requestAccountDeletion,
};
