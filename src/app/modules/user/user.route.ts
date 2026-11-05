import { Router } from "express";
import { upload } from "../../lib/multer";
import { requireAuth } from "../../middlewares/auth";
import { validateRequest } from "../../middlewares/validateRequest";
import { UserController } from "./user.controller";
import { userValidation } from "./user.validation";

const router = Router();

router.get("/me", requireAuth, UserController.getProfile);

router.patch(
	"/me",
	requireAuth,
	upload.single("image"),
	validateRequest(userValidation.updateProfile),
	UserController.updateProfile,
);

router.delete("/me/avatar", requireAuth, UserController.removeProfileImage);

router.delete(
	"/me",
	requireAuth,
	validateRequest(userValidation.requestAccountDeletion),
	UserController.requestAccountDeletion,
);

export const UserRoutes = router;
