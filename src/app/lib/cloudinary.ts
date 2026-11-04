import { v2 as Cloudinary, type UploadApiResponse } from "cloudinary";
import config from "../config";
import { AppError } from "../utils/AppError";

export const isCloudinaryConfigured = Boolean(
	config.cloudinary_cloud_name &&
		config.cloudinary_api_key &&
		config.cloudinary_api_secret,
);

if (isCloudinaryConfigured) {
	Cloudinary.config({
		cloud_name: config.cloudinary_cloud_name,
		api_key: config.cloudinary_api_key,
		api_secret: config.cloudinary_api_secret,
	});
}

export const cloudinary = Cloudinary;

export const uploadImageToCloudinary = (
	buffer: Buffer,
	folder: string,
): Promise<UploadApiResponse> => {
	if (!isCloudinaryConfigured) {
		throw new AppError(503, "Image upload is not configured on this server.");
	}

	return new Promise((resolve, reject) => {
		cloudinary.uploader
			.upload_stream({ resource_type: "image", folder }, (error, result) => {
				if (error) {
					reject(
						new AppError(502, "Image upload failed. Please try again.", {
							cause: error,
						}),
					);
					return;
				}

				if (!result) {
					reject(new AppError(502, "No result returned from Cloudinary."));
					return;
				}

				resolve(result);
			})
			.end(buffer);
	});
};

export const deleteCloudinaryImage = async (publicId: string | null) => {
	if (!publicId || !isCloudinaryConfigured) return;

	try {
		await cloudinary.uploader.destroy(publicId);
	} catch (error) {
		console.warn(
			"Failed to delete a Cloudinary image:",
			error instanceof Error ? error.message : String(error),
		);
	}
};
