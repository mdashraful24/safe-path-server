import multer from "multer";
import { AppError } from "../utils/AppError";

const allowedImageTypes = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
]);

export const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024, files: 1 },
	fileFilter: (_req, file, callback) => {
		if (!allowedImageTypes.has(file.mimetype)) {
			callback(
				AppError.badRequest(
					"Only JPEG, PNG, WebP or GIF image files are allowed.",
				),
			);
			return;
		}

		callback(null, true);
	},
});
