import httpStatus from "http-status";
import { UserStatus } from "../../../../generated/prisma/enums";
import { cloudinary, deleteCloudinaryImage } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	IRequestAccountDeletionPayload,
	IUpdateProfilePayload,
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

	if (!user || user.isDeleted) {
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
		select: { id: true, imagePublicId: true },
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found.");
	}

	const data: {
		name?: string;
		imageUrl?: string;
		imagePublicId?: string;
	} = {};

	if (payload.name) {
		data.name = payload.name;
	}

	const uploadedImage = file ? await uploadProfileImage(file) : null;

	if (uploadedImage) {
		data.imageUrl = uploadedImage.imageUrl;
		data.imagePublicId = uploadedImage.imagePublicId;
	}

	if (Object.keys(data).length === 0) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Provide a name or profile picture to update.",
		);
	}

	try {
		const updated = await prisma.user.update({
			where: { id: userId },
			data,
			omit: { passwordHash: true },
		});

		if (uploadedImage && user.imagePublicId) {
			await deleteCloudinaryImage(user.imagePublicId);
		}

		return updated;
	} catch (error) {
		if (uploadedImage) {
			await deleteCloudinaryImage(uploadedImage.imagePublicId);
		}
		throw error;
	}
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

	if (!user || user.isDeleted || user.status === UserStatus.DELETED) {
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

	await prisma.user.update({
		where: { id: userId },
		data: {
			status: UserStatus.PENDING_DELETION,
			deletionRequestedAt: new Date(),
			deletionRequestReason: payload.reason?.trim() || null,
			tokenVersion: { increment: 1 },
		},
	});
};

export const UserService = {
	getProfile,
	updateProfile,
	removeProfileImage,
	requestAccountDeletion,
};
