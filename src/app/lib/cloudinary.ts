import { v2 as Cloudinary } from "cloudinary";
import config from "../config";
import logger from "../logger";

Cloudinary.config({
	cloud_name: config.cloudinary_cloud_name,
	api_key: config.cloudinary_api_key,
	api_secret: config.cloudinary_api_secret,
});

export const cloudinary = Cloudinary;

export const deleteCloudinaryImage = async (publicId: string) => {
	try {
		await cloudinary.uploader.destroy(publicId);
	} catch (error) {
		logger.error("Failed to delete Cloudinary image:", error);
	}
};
